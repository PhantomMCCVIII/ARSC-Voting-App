import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  schoolLevelSelectionSchema, 
  insertUserSchema, 
  insertPartylistSchema, 
  insertPositionSchema, 
  insertCandidateSchema, 
  insertVoteSchema,
  insertSchoolSettingsSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import path from "path";

const MemoryStore = createMemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "voting-app-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // For handling file uploads (in case we implement that later)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByReferenceNumber(data.referenceNumber);

      if (!user || user.name !== data.name) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set user in session
      (req.session as any).user = {
        id: user.id,
        name: user.name,
        isAdmin: user.isAdmin,
        hasVoted: user.hasVoted,
        schoolLevel: user.schoolLevel,
        gradeLevel: user.gradeLevel,
      };

      res.json({
        id: user.id,
        name: user.name,
        isAdmin: user.isAdmin,
        hasVoted: user.hasVoted,
        schoolLevel: user.schoolLevel,
        gradeLevel: user.gradeLevel,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    const user = (req.session as any).user;
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(user);
  });

  // School level selection route
  app.post("/api/students/select-level", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const data = schoolLevelSelectionSchema.parse(req.body);

      // Update user in storage
      const updatedUser = await storage.updateUser(user.id, {
        schoolLevel: data.schoolLevel,
        gradeLevel: data.gradeLevel,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update session
      (req.session as any).user = {
        ...user,
        schoolLevel: data.schoolLevel,
        gradeLevel: data.gradeLevel,
      };

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        schoolLevel: updatedUser.schoolLevel,
        gradeLevel: updatedUser.gradeLevel,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // School settings routes
  app.get("/api/settings", async (req: Request, res: Response) => {
    const settings = await storage.getSchoolSettings();
    res.json(settings);
  });

  app.get("/uploads/:key", async (req: Request, res: Response) => {
    const file = await getFile(req.params.key);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(file);
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Parse incoming dates to ensure they're in correct format
      const formData = { ...req.body };
      
      // Only process dates if they are non-empty strings
      if (formData.startDate && formData.startDate.trim() !== '') {
        try {
          formData.startDate = new Date(formData.startDate).toISOString();
        } catch (e) {
          return res.status(400).json({ message: "Invalid start date format" });
        }
      } else {
        formData.startDate = null;
      }
      
      if (formData.endDate && formData.endDate.trim() !== '') {
        try {
          formData.endDate = new Date(formData.endDate).toISOString();
        } catch (e) {
          return res.status(400).json({ message: "Invalid end date format" });
        }
      } else {
        formData.endDate = null;
      }

      // Handle base64 image uploads
      if (formData.logo1?.startsWith('data:image')) {
        const base64Data = formData.logo1.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        formData.logo1 = await uploadFile(buffer, `logo1-${Date.now()}.png`);
      }
      
      if (formData.logo2?.startsWith('data:image')) {
        const base64Data = formData.logo2.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        formData.logo2 = await uploadFile(buffer, `logo2-${Date.now()}.png`);
      }
      
      const data = insertSchoolSettingsSchema.partial().parse(formData);
      const settings = await storage.updateSchoolSettings(data);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Partylist routes
  app.get("/api/partylists", async (req: Request, res: Response) => {
    const partylists = await storage.getAllPartylists();
    res.json(partylists);
  });

  app.get("/api/partylists/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const partylist = await storage.getPartylist(id);
    if (!partylist) {
      return res.status(404).json({ message: "Partylist not found" });
    }

    res.json(partylist);
  });

  app.post("/api/partylists", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = insertPartylistSchema.parse(req.body);
      const partylist = await storage.createPartylist(data);
      res.status(201).json(partylist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/partylists/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const data = insertPartylistSchema.partial().parse(req.body);
      const partylist = await storage.updatePartylist(id, data);
      
      if (!partylist) {
        return res.status(404).json({ message: "Partylist not found" });
      }

      res.json(partylist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/partylists/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const success = await storage.deletePartylist(id);
      if (!success) {
        return res.status(404).json({ message: "Partylist not found" });
      }

      res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Position routes
  app.get("/api/positions", async (req: Request, res: Response) => {
    const positions = await storage.getAllPositions();
    res.json(positions);
  });

  app.get("/api/positions/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const position = await storage.getPosition(id);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    res.json(position);
  });

  app.post("/api/positions", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(data);
      res.status(201).json(position);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/positions/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const data = insertPositionSchema.partial().parse(req.body);
      const position = await storage.updatePosition(id, data);
      
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }

      res.json(position);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/positions/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const success = await storage.deletePosition(id);
      if (!success) {
        return res.status(404).json({ message: "Position not found" });
      }

      res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Candidate routes
  app.get("/api/candidates", async (req: Request, res: Response) => {
    const positionId = req.query.positionId ? parseInt(req.query.positionId as string) : undefined;
    const schoolLevel = req.query.schoolLevel as string | undefined;
    const gradeLevel = req.query.gradeLevel ? parseInt(req.query.gradeLevel as string) : undefined;

    let candidates;
    
    if (positionId) {
      candidates = await storage.getCandidatesByPosition(positionId);
    } else if (schoolLevel && gradeLevel) {
      candidates = await storage.getCandidatesBySchoolAndGrade(schoolLevel, gradeLevel);
    } else {
      candidates = await storage.getAllCandidates();
    }

    res.json(candidates);
  });

  app.get("/api/candidates/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const candidate = await storage.getCandidate(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.json(candidate);
  });

  app.post("/api/candidates", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(data);
      res.status(201).json(candidate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const data = insertCandidateSchema.partial().parse(req.body);
      const candidate = await storage.updateCandidate(id, data);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const success = await storage.deleteCandidate(id);
      if (!success) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management (for admin)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const users = await storage.getAllUsers();
      // Filter out sensitive information
      const filteredUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        referenceNumber: user.referenceNumber,
        schoolLevel: user.schoolLevel,
        gradeLevel: user.gradeLevel,
        hasVoted: user.hasVoted,
        isAdmin: user.isAdmin
      }));
      
      res.json(filteredUsers);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = insertUserSchema.parse(req.body);
      
      // Check if user with same reference number already exists
      const existingUser = await storage.getUserByReferenceNumber(data.referenceNumber);
      if (existingUser) {
        return res.status(409).json({ message: "User with this reference number already exists" });
      }

      const newUser = await storage.createUser(data);
      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        referenceNumber: newUser.referenceNumber,
        schoolLevel: newUser.schoolLevel,
        gradeLevel: newUser.gradeLevel,
        hasVoted: newUser.hasVoted,
        isAdmin: newUser.isAdmin
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/bulk", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const usersData = z.array(insertUserSchema).parse(req.body);
      
      const results = [];
      for (const userData of usersData) {
        // Skip if user with same reference number exists
        const existingUser = await storage.getUserByReferenceNumber(userData.referenceNumber);
        if (existingUser) {
          results.push({
            success: false,
            referenceNumber: userData.referenceNumber,
            message: "User with this reference number already exists"
          });
          continue;
        }

        const newUser = await storage.createUser(userData);
        results.push({
          success: true,
          id: newUser.id,
          name: newUser.name,
          referenceNumber: newUser.referenceNumber
        });
      }
      
      res.status(201).json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const data = insertUserSchema.partial().parse(req.body);
      
      // If reference number is being updated, check for duplicates
      if (data.referenceNumber) {
        const existingUser = await storage.getUserByReferenceNumber(data.referenceNumber);
        if (existingUser && existingUser.id !== id) {
          return res.status(409).json({ message: "User with this reference number already exists" });
        }
      }

      const updatedUser = await storage.updateUser(id, data);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        referenceNumber: updatedUser.referenceNumber,
        schoolLevel: updatedUser.schoolLevel,
        gradeLevel: updatedUser.gradeLevel,
        hasVoted: updatedUser.hasVoted,
        isAdmin: updatedUser.isAdmin
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      // Don't allow deleting yourself
      if (id === user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/:id/reset-vote", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const updatedUser = await storage.resetUserVote(id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        referenceNumber: updatedUser.referenceNumber,
        schoolLevel: updatedUser.schoolLevel,
        gradeLevel: updatedUser.gradeLevel,
        hasVoted: updatedUser.hasVoted,
        isAdmin: updatedUser.isAdmin
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Voting routes
  app.post("/api/votes", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get the user to check if they've already voted
      const userRecord = await storage.getUser(user.id);
      if (!userRecord) {
        return res.status(404).json({ message: "User not found" });
      }

      // Make sure position exists
      const position = await storage.getPosition(req.body.positionId);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }

      // Make sure candidate exists
      const candidate = await storage.getCandidate(req.body.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Make sure candidate is for the correct position
      if (candidate.positionId !== position.id) {
        return res.status(400).json({ message: "Candidate is not for this position" });
      }

      // Create vote
      const voteData = insertVoteSchema.parse({
        userId: user.id,
        candidateId: req.body.candidateId,
        positionId: req.body.positionId
      });

      const vote = await storage.createVote(voteData);
      
      // Update session
      (req.session as any).user = {
        ...user,
        hasVoted: true
      };

      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/votes/stats", async (req: Request, res: Response) => {
    try {
      const user = (req.session as any).user;
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get vote counts by position and candidate
      const voteCounts = await storage.getVoteCounts();
      
      // Get all positions
      const positions = await storage.getAllPositions();
      
      // Get all users
      const users = await storage.getAllUsers();
      const totalStudents = users.filter(u => !u.isAdmin).length;
      const votedStudents = users.filter(u => !u.isAdmin && u.hasVoted).length;
      const participationRate = totalStudents > 0 ? (votedStudents / totalStudents) * 100 : 0;

      // Get all candidates
      const candidates = await storage.getAllCandidates();

      // Calculate vote distribution by position
      const votesByPosition = positions.map(position => {
        const positionVotes = voteCounts
          .filter(vc => vc.positionId === position.id)
          .reduce((sum, vc) => sum + vc.count, 0);
        
        return {
          positionId: position.id,
          positionName: position.name,
          votes: positionVotes,
          percentage: totalStudents > 0 ? (positionVotes / totalStudents) * 100 : 0
        };
      });

      // Calculate vote distribution by school level
      const schoolLevels = ["elementary", "juniorHigh", "seniorHigh"];
      const votesBySchoolLevel = schoolLevels.map(level => {
        const levelUsers = users.filter(u => !u.isAdmin && u.schoolLevel === level);
        const levelVotedUsers = levelUsers.filter(u => u.hasVoted);
        
        return {
          schoolLevel: level,
          totalStudents: levelUsers.length,
          votedStudents: levelVotedUsers.length,
          percentage: levelUsers.length > 0 ? (levelVotedUsers.length / levelUsers.length) * 100 : 0
        };
      });

      // Calculate vote distribution by candidate for each position
      const votesByCandidateAndPosition = positions.map(position => {
        const positionCandidates = candidates.filter(c => c.positionId === position.id);
        
        const candidateResults = positionCandidates.map(candidate => {
          const voteCount = voteCounts
            .find(vc => vc.positionId === position.id && vc.candidateId === candidate.id)?.count || 0;
          
          return {
            candidateId: candidate.id,
            candidateName: candidate.name,
            votes: voteCount,
            percentage: totalStudents > 0 ? (voteCount / totalStudents) * 100 : 0
          };
        });

        return {
          positionId: position.id,
          positionName: position.name,
          candidates: candidateResults
        };
      });

      res.json({
        summary: {
          totalStudents,
          votedStudents,
          participationRate
        },
        votesByPosition,
        votesBySchoolLevel,
        votesByCandidateAndPosition
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

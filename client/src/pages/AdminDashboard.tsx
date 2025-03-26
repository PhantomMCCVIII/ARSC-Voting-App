import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

interface VoteStats {
  summary: {
    totalStudents: number;
    votedStudents: number;
    participationRate: number;
  };
  votesByPosition: {
    positionId: number;
    positionName: string;
    votes: number;
    percentage: number;
  }[];
  votesBySchoolLevel: {
    schoolLevel: string;
    totalStudents: number;
    votedStudents: number;
    percentage: number;
  }[];
  votesByCandidateAndPosition: {
    positionId: number;
    positionName: string;
    candidates: {
      candidateId: number;
      candidateName: string;
      votes: number;
      percentage: number;
    }[];
  }[];
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  const { data: voteStats, isLoading: isLoadingStats } = useQuery<VoteStats>({
    queryKey: ["/api/votes/stats"],
    enabled: !!user && isAdmin,
  });

  // Helper function to format school level names
  const formatSchoolLevel = (level: string): string => {
    switch (level) {
      case "elementary":
        return "Elementary (Grades 3-6)";
      case "juniorHigh":
        return "Junior High (Grades 7-10)";
      case "seniorHigh":
        return "Senior High (Grades 11-12)";
      default:
        return level;
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-medium mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium">
              {isLoadingStats ? "..." : voteStats?.summary.totalStudents || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Votes Cast</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium">
              {isLoadingStats ? "..." : voteStats?.summary.votedStudents || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Participation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium">
              {isLoadingStats ? "..." : `${(voteStats?.summary.participationRate || 0).toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Voter Distribution by Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingStats ? (
              <p>Loading stats...</p>
            ) : voteStats?.votesByPosition.length === 0 ? (
              <p>No voting data available</p>
            ) : (
              voteStats?.votesByPosition.map((position) => (
                <div key={position.positionId}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{position.positionName}</span>
                    <span>{position.votes} votes</span>
                  </div>
                  <Progress value={position.percentage} className="h-2.5" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-medium">Voter Distribution by School Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingStats ? (
              <p>Loading stats...</p>
            ) : voteStats?.votesBySchoolLevel.length === 0 ? (
              <p>No voting data available</p>
            ) : (
              voteStats?.votesBySchoolLevel.map((level) => (
                <div key={level.schoolLevel}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{formatSchoolLevel(level.schoolLevel)}</span>
                    <span>{level.votedStudents} votes</span>
                  </div>
                  <Progress value={level.percentage} className="h-2.5 bg-accent-foreground/20" indicatorClassName="bg-accent" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Edit, Trash2, RotateCcw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface User {
  id: number;
  name: string;
  referenceNumber: string;
  schoolLevel: string | null;
  gradeLevel: number | null;
  hasVoted: boolean;
  isAdmin: boolean;
}

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  referenceNumber: z.string().min(1, "Reference number is required"),
  isAdmin: z.boolean().default(false),
  schoolLevel: z.string().nullable().optional(),
  gradeLevel: z.number().nullable().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

const bulkUserSchema = z.array(
  z.object({
    name: z.string().min(1, "Name is required"),
    referenceNumber: z.string().min(1, "Reference number is required"),
  })
);

export default function AdminStudents() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [bulkUploadContent, setBulkUploadContent] = useState<string>("");
  const [bulkUploadData, setBulkUploadData] = useState<{ name: string; referenceNumber: string }[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);

  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolLevelFilter, setSchoolLevelFilter] = useState<string>("all");
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && isAdmin,
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      referenceNumber: "",
      isAdmin: false,
      schoolLevel: null,
      gradeLevel: null,
    },
  });

  // Reset form when editing user changes
  useEffect(() => {
    if (editingUser) {
      form.reset({
        name: editingUser.name,
        referenceNumber: editingUser.referenceNumber,
        isAdmin: editingUser.isAdmin,
        schoolLevel: editingUser.schoolLevel,
        gradeLevel: editingUser.gradeLevel,
      });
    } else {
      form.reset({
        name: "",
        referenceNumber: "",
        isAdmin: false,
        schoolLevel: null,
        gradeLevel: null,
      });
    }
  }, [editingUser, form]);

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Student created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserFormValues }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "Success",
        description: "Student updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteDialogOpen(false);
      setDeletingUserId(null);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetVoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/users/${id}/reset-vote`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsResetDialogOpen(false);
      setResettingUserId(null);
      toast({
        title: "Success",
        description: "Student vote reset successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset student vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkCreateUsersMutation = useMutation({
    mutationFn: async (data: { name: string; referenceNumber: string }[]) => {
      const res = await apiRequest("POST", "/api/users/bulk", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsBulkDialogOpen(false);
      setBulkUploadContent("");
      setBulkUploadData([]);
      
      const successCount = data.filter((result: any) => result.success).length;
      const failCount = data.length - successCount;
      
      toast({
        title: "Bulk Registration Complete",
        description: `Successfully registered ${successCount} students. ${failCount > 0 ? `Failed: ${failCount}` : ''}`,
        variant: failCount > 0 ? "default" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to register students",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingUserId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleResetVote = (id: number) => {
    setResettingUserId(id);
    setIsResetDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingUserId !== null) {
      deleteUserMutation.mutate(deletingUserId);
    }
  };

  const confirmResetVote = () => {
    if (resettingUserId !== null) {
      resetVoteMutation.mutate(resettingUserId);
    }
  };

  const handleBulkUpload = () => {
    setIsBulkDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkUploadContent(content);
      parseBulkUploadData(content);
    };
    reader.readAsText(file);
  };

  const parseBulkUploadData = (content: string) => {
    const lines = content.split('\n');
    const data: { name: string; referenceNumber: string }[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return; // Skip empty lines
      
      const parts = line.split(',');
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Invalid format. Expected "Name, Reference Number"`);
        return;
      }

      const name = parts[0].trim();
      const referenceNumber = parts[1].trim();

      if (!name) {
        errors.push(`Line ${index + 1}: Name is required`);
        return;
      }

      if (!referenceNumber) {
        errors.push(`Line ${index + 1}: Reference number is required`);
        return;
      }

      data.push({ name, referenceNumber });
    });

    setBulkUploadData(data);
    setBulkUploadErrors(errors);
  };

  const confirmBulkUpload = () => {
    if (bulkUploadData.length > 0) {
      bulkCreateUsersMutation.mutate(bulkUploadData);
    }
  };

  // Filter users based on search term and filters
  const filteredUsers = users
    ? users.filter(user => {
        // Skip admin users
        if (user.isAdmin) return false;
        
        // Apply search filter
        const matchesSearch = 
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Apply school level filter
        const matchesSchoolLevel = 
          schoolLevelFilter === "all" || 
          (schoolLevelFilter === "none" && !user.schoolLevel) ||
          user.schoolLevel === schoolLevelFilter;
        
        // Apply grade level filter
        const matchesGradeLevel = 
          gradeLevelFilter === "all" || 
          (gradeLevelFilter === "none" && !user.gradeLevel) ||
          (user.gradeLevel && user.gradeLevel.toString() === gradeLevelFilter);
        
        return matchesSearch && matchesSchoolLevel && matchesGradeLevel;
      })
    : [];

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const formatSchoolLevel = (level: string | null): string => {
    if (!level) return "Not set";
    switch (level) {
      case "elementary": return "Elementary";
      case "juniorHigh": return "Junior High";
      case "seniorHigh": return "Senior High";
      default: return level;
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Manage Students</h1>
        <div className="space-x-2">
          <Button onClick={handleBulkUpload} variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Mass Registration
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-grow">
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              value={schoolLevelFilter}
              onValueChange={setSchoolLevelFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="School Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All School Levels</SelectItem>
                <SelectItem value="elementary">Elementary</SelectItem>
                <SelectItem value="juniorHigh">Junior High</SelectItem>
                <SelectItem value="seniorHigh">Senior High</SelectItem>
                <SelectItem value="none">Not Set</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={gradeLevelFilter}
              onValueChange={setGradeLevelFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grade Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="3">Grade 3</SelectItem>
                <SelectItem value="4">Grade 4</SelectItem>
                <SelectItem value="5">Grade 5</SelectItem>
                <SelectItem value="6">Grade 6</SelectItem>
                <SelectItem value="7">Grade 7</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
                <SelectItem value="none">Not Set</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Reference Number</TableHead>
              <TableHead>School Level</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Voted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : !currentItems || currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No students found</TableCell>
              </TableRow>
            ) : (
              currentItems.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.referenceNumber}</TableCell>
                  <TableCell>{formatSchoolLevel(student.schoolLevel)}</TableCell>
                  <TableCell>{student.gradeLevel ? `Grade ${student.gradeLevel}` : "Not set"}</TableCell>
                  <TableCell>
                    {student.hasVoted ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleResetVote(student.id)}
                      disabled={!student.hasVoted}
                      className={`text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 ${!student.hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Reset Vote"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(student)}
                      className="text-secondary hover:text-secondary-foreground hover:bg-secondary/20"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(student.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive/20"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
              <span className="font-medium">
                {indexOfLastItem > filteredUsers.length ? filteredUsers.length : indexOfLastItem}
              </span>{" "}
              of <span className="font-medium">{filteredUsers.length}</span> results
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
              let pageNumber = currentPage;
              if (totalPages <= 5) {
                pageNumber = index + 1;
              } else if (currentPage <= 3) {
                pageNumber = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + index;
              } else {
                pageNumber = currentPage - 2 + index;
              }
              
              return (
                <Button
                  key={index}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Student Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Update the student details"
                : "Enter the details for the new student"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter student name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reference number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending
                    ? "Saving..."
                    : editingUser ? "Save Changes" : "Add Student"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mass Student Registration</DialogTitle>
            <DialogDescription>
              Upload a CSV file with student data or paste the data below.
              Format: Name, Reference Number (one student per line)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".csv,.txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-20">
                <div className="flex flex-col items-center">
                  <Upload className="h-6 w-6 mb-2" />
                  <span>Click to upload CSV file</span>
                </div>
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Or paste data here</label>
              <textarea
                className="w-full h-40 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="John Doe, REF12345&#10;Jane Smith, REF67890&#10;..."
                value={bulkUploadContent}
                onChange={(e) => {
                  setBulkUploadContent(e.target.value);
                  parseBulkUploadData(e.target.value);
                }}
              ></textarea>
            </div>

            {bulkUploadErrors.length > 0 && (
              <div className="text-red-500 text-sm">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc pl-5 mt-1">
                  {bulkUploadErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {bulkUploadData.length > 0 && (
              <div className="text-green-600 text-sm">
                <p>{bulkUploadData.length} valid student records found.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmBulkUpload}
              disabled={bulkUploadData.length === 0 || bulkCreateUsersMutation.isPending}
            >
              {bulkCreateUsersMutation.isPending ? "Uploading..." : "Upload Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this student. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Vote Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset student's vote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all votes cast by this student, allowing them to vote again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetVote} className="bg-yellow-600 text-white hover:bg-yellow-700">
              {resetVoteMutation.isPending ? "Resetting..." : "Reset Vote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

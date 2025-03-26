import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Upload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Position {
  id: number;
  name: string;
  maxVotes: number;
  schoolLevels: string[];
  displayOrder: number;
}

interface Partylist {
  id: number;
  name: string;
  color: string;
  logo: string;
}

interface Candidate {
  id: number;
  name: string;
  photo: string;
  positionId: number;
  partylistId: number;
  schoolLevels: string[];
  gradeLevels: number[];
}

const candidateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  photo: z.string().optional(),
  positionId: z.number({
    required_error: "Position is required",
  }),
  partylistId: z.number({
    required_error: "Partylist is required",
  }),
  schoolLevels: z.array(z.string()).min(1, "At least one school level must be selected"),
  gradeLevels: z.array(z.number()).min(1, "At least one grade level must be selected"),
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

const schoolLevelOptions = [
  { id: "elementary", label: "Elementary" },
  { id: "juniorHigh", label: "Junior High School" },
  { id: "seniorHigh", label: "Senior High School" },
];

const gradeOptions = [
  { level: "elementary", grades: [3, 4, 5, 6] },
  { level: "juniorHigh", grades: [7, 8, 9, 10] },
  { level: "seniorHigh", grades: [11, 12] },
];

export default function AdminCandidates() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const photoFileRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidateId, setDeletingCandidateId] = useState<number | null>(null);
  const [availableGrades, setAvailableGrades] = useState<number[]>([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  const { data: positions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    enabled: !!user && isAdmin,
  });

  const { data: partylists } = useQuery<Partylist[]>({
    queryKey: ["/api/partylists"],
    enabled: !!user && isAdmin,
  });

  const { data: candidates, isLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    enabled: !!user && isAdmin,
  });

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      photo: "",
      positionId: undefined,
      partylistId: undefined,
      schoolLevels: ["elementary", "juniorHigh", "seniorHigh"],
      gradeLevels: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
  });

  // Reset form when editing candidate changes
  useEffect(() => {
    if (editingCandidate) {
      form.reset({
        name: editingCandidate.name,
        photo: editingCandidate.photo || "",
        positionId: editingCandidate.positionId,
        partylistId: editingCandidate.partylistId,
        schoolLevels: editingCandidate.schoolLevels,
        gradeLevels: editingCandidate.gradeLevels,
      });
    } else {
      form.reset({
        name: "",
        photo: "",
        positionId: undefined,
        partylistId: undefined,
        schoolLevels: ["elementary", "juniorHigh", "seniorHigh"],
        gradeLevels: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      });
    }
  }, [editingCandidate, form]);

  // Update available grades based on selected school levels
  const watchSchoolLevels = form.watch("schoolLevels");
  
  useEffect(() => {
    if (watchSchoolLevels) {
      const grades: number[] = [];
      watchSchoolLevels.forEach(level => {
        const levelGrades = gradeOptions.find(option => option.level === level)?.grades || [];
        grades.push(...levelGrades);
      });
      
      setAvailableGrades(grades);
      
      // Filter out grades that are no longer available
      const currentGrades = form.getValues("gradeLevels");
      const filteredGrades = currentGrades.filter(grade => grades.includes(grade));
      
      if (filteredGrades.length !== currentGrades.length) {
        form.setValue("gradeLevels", filteredGrades);
      }
    }
  }, [watchSchoolLevels, form]);

  const createCandidateMutation = useMutation({
    mutationFn: async (data: CandidateFormValues) => {
      const res = await apiRequest("POST", "/api/candidates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Candidate created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create candidate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CandidateFormValues }) => {
      const res = await apiRequest("PUT", `/api/candidates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsDialogOpen(false);
      setEditingCandidate(null);
      toast({
        title: "Success",
        description: "Candidate updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update candidate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsDeleteDialogOpen(false);
      setDeletingCandidateId(null);
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete candidate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CandidateFormValues) => {
    if (editingCandidate) {
      updateCandidateMutation.mutate({ id: editingCandidate.id, data });
    } else {
      createCandidateMutation.mutate(data);
    }
  };

  const handleAdd = () => {
    setEditingCandidate(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingCandidateId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingCandidateId !== null) {
      deleteCandidateMutation.mutate(deletingCandidateId);
    }
  };

  const getPositionName = (positionId: number): string => {
    return positions?.find(p => p.id === positionId)?.name || "Unknown";
  };

  const getPartylistName = (partylistId: number): string => {
    return partylists?.find(p => p.id === partylistId)?.name || "Unknown";
  };

  const formatSchoolLevels = (levels: string[]): string => {
    if (levels.length === 3) return "All";
    return levels.map(level => {
      if (level === "elementary") return "Elementary";
      if (level === "juniorHigh") return "Junior High";
      if (level === "seniorHigh") return "Senior High";
      return level;
    }).join(", ");
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Manage Candidates</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Candidate
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Partylist</TableHead>
              <TableHead>School Levels</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : !candidates || candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No candidates found</TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="flex items-center gap-2">
                    {candidate.photo ? (
                      <img 
                        src={candidate.photo} 
                        alt={candidate.name} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">{candidate.name.charAt(0)}</span>
                      </div>
                    )}
                    <span>{candidate.name}</span>
                  </TableCell>
                  <TableCell>{getPositionName(candidate.positionId)}</TableCell>
                  <TableCell>{getPartylistName(candidate.partylistId)}</TableCell>
                  <TableCell>{formatSchoolLevels(candidate.schoolLevels)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(candidate)}
                      className="text-secondary hover:text-secondary-foreground hover:bg-secondary/20"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(candidate.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive/20"
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

      {/* Add/Edit Candidate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCandidate ? "Edit Candidate" : "Add New Candidate"}</DialogTitle>
            <DialogDescription>
              {editingCandidate 
                ? "Update the candidate details"
                : "Enter the details for the new candidate"}
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
                      <Input placeholder="Enter candidate name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Photo</FormLabel>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center">
                      {field.value ? (
                        <img src={field.value} alt="Candidate Photo" className="h-24 w-24 object-cover rounded-full mb-2" />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-400 mb-2">
                          No photo
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={photoFileRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Create a local URL for the image
                          const imageUrl = URL.createObjectURL(file);
                          field.onChange(imageUrl);
                          
                          toast({
                            title: "Photo selected",
                            description: "The photo has been selected successfully.",
                          });
                        }}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => photoFileRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {field.value ? "Change Photo" : "Upload Photo"}
                        </Button>
                        {field.value && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange("")}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/20"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Or enter a photo URL:</p>
                    <FormControl>
                      <Input placeholder="Enter photo URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions?.map((position) => (
                          <SelectItem key={position.id} value={position.id.toString()}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partylistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partylist</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select partylist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partylists?.map((partylist) => (
                          <SelectItem key={partylist.id} value={partylist.id.toString()}>
                            {partylist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolLevels"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>School Levels</FormLabel>
                    </div>
                    <div className="space-y-2">
                      {schoolLevelOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={form.control}
                          name="schoolLevels"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, option.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== option.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gradeLevels"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Grade Levels</FormLabel>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {availableGrades.map((grade) => (
                        <FormField
                          key={grade}
                          control={form.control}
                          name="gradeLevels"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={grade}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(grade)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, grade])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== grade
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Grade {grade}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createCandidateMutation.isPending || updateCandidateMutation.isPending}
                >
                  {createCandidateMutation.isPending || updateCandidateMutation.isPending
                    ? "Saving..."
                    : editingCandidate ? "Save Changes" : "Add Candidate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this candidate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deleteCandidateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

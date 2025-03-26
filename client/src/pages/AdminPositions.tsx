import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Position {
  id: number;
  name: string;
  maxVotes: number;
  schoolLevels: string[];
  displayOrder: number;
}

const positionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  maxVotes: z.number().min(1, "Max votes must be at least 1"),
  schoolLevels: z.array(z.string()).min(1, "At least one school level must be selected"),
  displayOrder: z.number().min(0, "Display order must be a positive number"),
});

type PositionFormValues = z.infer<typeof positionSchema>;

export default function AdminPositions() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPositionId, setDeletingPositionId] = useState<number | null>(null);

  const schoolLevelOptions = [
    { id: "elementary", label: "Elementary" },
    { id: "juniorHigh", label: "Junior High School" },
    { id: "seniorHigh", label: "Senior High School" },
  ];

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  const { data: positions, isLoading } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    enabled: !!user && isAdmin,
  });

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      name: "",
      maxVotes: 1,
      schoolLevels: ["elementary", "juniorHigh", "seniorHigh"],
      displayOrder: 0,
    },
  });

  // Reset form when editing position changes
  useEffect(() => {
    if (editingPosition) {
      form.reset({
        name: editingPosition.name,
        maxVotes: editingPosition.maxVotes,
        schoolLevels: editingPosition.schoolLevels,
        displayOrder: editingPosition.displayOrder,
      });
    } else {
      form.reset({
        name: "",
        maxVotes: 1,
        schoolLevels: ["elementary", "juniorHigh", "seniorHigh"],
        displayOrder: positions ? positions.length : 0,
      });
    }
  }, [editingPosition, form, positions]);

  const createPositionMutation = useMutation({
    mutationFn: async (data: PositionFormValues) => {
      const res = await apiRequest("POST", "/api/positions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Position created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create position",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PositionFormValues }) => {
      const res = await apiRequest("PUT", `/api/positions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsDialogOpen(false);
      setEditingPosition(null);
      toast({
        title: "Success",
        description: "Position updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update position",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsDeleteDialogOpen(false);
      setDeletingPositionId(null);
      toast({
        title: "Success",
        description: "Position deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete position",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PositionFormValues) => {
    if (editingPosition) {
      updatePositionMutation.mutate({ id: editingPosition.id, data });
    } else {
      createPositionMutation.mutate(data);
    }
  };

  const handleAdd = () => {
    setEditingPosition(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingPositionId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingPositionId !== null) {
      deletePositionMutation.mutate(deletingPositionId);
    }
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
        <h1 className="text-2xl font-medium">Manage Positions</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Position
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Max Votes</TableHead>
              <TableHead>School Levels</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : !positions || positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No positions found</TableCell>
              </TableRow>
            ) : (
              positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>{position.name}</TableCell>
                  <TableCell>{position.maxVotes}</TableCell>
                  <TableCell>{formatSchoolLevels(position.schoolLevels)}</TableCell>
                  <TableCell>{position.displayOrder}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(position)}
                      className="text-secondary hover:text-secondary-foreground hover:bg-secondary/20"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(position.id)}
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

      {/* Add/Edit Position Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPosition ? "Edit Position" : "Add New Position"}</DialogTitle>
            <DialogDescription>
              {editingPosition 
                ? "Update the position details"
                : "Enter the details for the new position"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter position name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxVotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Votes</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="Enter maximum votes allowed" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="Enter display order" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createPositionMutation.isPending || updatePositionMutation.isPending}
                >
                  {createPositionMutation.isPending || updatePositionMutation.isPending
                    ? "Saving..."
                    : editingPosition ? "Save Changes" : "Add Position"}
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
              This action will permanently delete this position. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deletePositionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

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

interface Partylist {
  id: number;
  name: string;
  color: string;
  logo: string;
  platformImage: string;
  groupPhoto: string;
}

const partylistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  logo: z.string().optional(),
  platformImage: z.string().optional(),
  groupPhoto: z.string().optional(),
});

type PartylistFormValues = z.infer<typeof partylistSchema>;

export default function AdminPartylists() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoFileRef = useRef<HTMLInputElement>(null);
  const platformImageFileRef = useRef<HTMLInputElement>(null);
  const groupPhotoFileRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPartylist, setEditingPartylist] = useState<Partylist | null>(null);
  const [deletingPartylistId, setDeletingPartylistId] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  const { data: partylists, isLoading } = useQuery<Partylist[]>({
    queryKey: ["/api/partylists"],
    enabled: !!user && isAdmin,
  });

  const form = useForm<PartylistFormValues>({
    resolver: zodResolver(partylistSchema),
    defaultValues: {
      name: "",
      color: "#3F51B5",
      logo: "",
      platformImage: "",
      groupPhoto: "",
    },
  });

  // Reset form when editing partylist changes
  useEffect(() => {
    if (editingPartylist) {
      form.reset({
        name: editingPartylist.name,
        color: editingPartylist.color,
        logo: editingPartylist.logo || "",
        platformImage: editingPartylist.platformImage || "",
        groupPhoto: editingPartylist.groupPhoto || "",
      });
    } else {
      form.reset({
        name: "",
        color: "#3F51B5",
        logo: "",
        platformImage: "",
        groupPhoto: "",
      });
    }
  }, [editingPartylist, form]);

  const createPartylistMutation = useMutation({
    mutationFn: async (data: PartylistFormValues) => {
      const res = await apiRequest("POST", "/api/partylists", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partylists"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Partylist created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create partylist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePartylistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PartylistFormValues }) => {
      const res = await apiRequest("PUT", `/api/partylists/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partylists"] });
      setIsDialogOpen(false);
      setEditingPartylist(null);
      toast({
        title: "Success",
        description: "Partylist updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update partylist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePartylistMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/partylists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partylists"] });
      setIsDeleteDialogOpen(false);
      setDeletingPartylistId(null);
      toast({
        title: "Success",
        description: "Partylist deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete partylist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PartylistFormValues) => {
    if (editingPartylist) {
      updatePartylistMutation.mutate({ id: editingPartylist.id, data });
    } else {
      createPartylistMutation.mutate(data);
    }
  };

  const handleAdd = () => {
    setEditingPartylist(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (partylist: Partylist) => {
    setEditingPartylist(partylist);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingPartylistId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingPartylistId !== null) {
      deletePartylistMutation.mutate(deletingPartylistId);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Manage Partylists</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Partylist
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : !partylists || partylists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No partylists found</TableCell>
              </TableRow>
            ) : (
              partylists.map((partylist) => (
                <TableRow key={partylist.id}>
                  <TableCell>{partylist.name}</TableCell>
                  <TableCell>
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: partylist.color }}
                    ></div>
                  </TableCell>
                  <TableCell>
                    {partylist.logo ? (
                      <img 
                        src={partylist.logo} 
                        alt={`${partylist.name} Logo`} 
                        className="h-8 object-contain" 
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {partylist.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(partylist)}
                      className="text-secondary hover:text-secondary-foreground hover:bg-secondary/20"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(partylist.id)}
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

      {/* Add/Edit Partylist Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartylist ? "Edit Partylist" : "Add New Partylist"}</DialogTitle>
            <DialogDescription>
              {editingPartylist 
                ? "Update the partylist details"
                : "Enter the details for the new partylist"}
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
                      <Input placeholder="Enter partylist name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                        <Input {...field} className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partylist Logo</FormLabel>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center">
                      {field.value ? (
                        <img src={field.value} alt="Partylist Logo" className="h-16 object-contain mb-2" />
                      ) : (
                        <div className="h-16 mb-2 flex items-center justify-center text-gray-400">
                          No logo uploaded
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={logoFileRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Create a local URL for the image
                          const imageUrl = URL.createObjectURL(file);
                          field.onChange(imageUrl);
                          
                          toast({
                            title: "Logo selected",
                            description: "The logo has been selected successfully.",
                          });
                        }}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoFileRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {field.value ? "Change Logo" : "Upload Logo"}
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
                    <p className="text-xs text-gray-500 mt-1">Or enter a logo URL:</p>
                    <FormControl>
                      <Input placeholder="Enter logo URL" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platformImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform Image</FormLabel>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center">
                      {field.value ? (
                        <img src={field.value} alt="Platform Image" className="h-24 object-contain mb-2" />
                      ) : (
                        <div className="h-24 mb-2 flex items-center justify-center text-gray-400">
                          No platform image uploaded
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={platformImageFileRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Create a local URL for the image
                          const imageUrl = URL.createObjectURL(file);
                          field.onChange(imageUrl);
                          
                          toast({
                            title: "Platform image selected",
                            description: "The platform image has been selected successfully.",
                          });
                        }}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => platformImageFileRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {field.value ? "Change Image" : "Upload Image"}
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
                    <p className="text-xs text-gray-500 mt-1">Or enter a platform image URL:</p>
                    <FormControl>
                      <Input placeholder="Enter platform image URL" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="groupPhoto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Photo</FormLabel>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center">
                      {field.value ? (
                        <img src={field.value} alt="Group Photo" className="h-32 object-contain mb-2" />
                      ) : (
                        <div className="h-32 mb-2 flex items-center justify-center text-gray-400">
                          No group photo uploaded
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={groupPhotoFileRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Create a local URL for the image
                          const imageUrl = URL.createObjectURL(file);
                          field.onChange(imageUrl);
                          
                          toast({
                            title: "Group photo selected",
                            description: "The group photo has been selected successfully.",
                          });
                        }}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => groupPhotoFileRef.current?.click()}
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
                    <p className="text-xs text-gray-500 mt-1">Or enter a group photo URL:</p>
                    <FormControl>
                      <Input placeholder="Enter group photo URL" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createPartylistMutation.isPending || updatePartylistMutation.isPending}
                >
                  {createPartylistMutation.isPending || updatePartylistMutation.isPending
                    ? "Saving..."
                    : editingPartylist ? "Save Changes" : "Add Partylist"}
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
              This action will permanently delete this partylist. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deletePartylistMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

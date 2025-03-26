import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SchoolSettings {
  id: number;
  schoolName: string;
  electionTitle: string;
  electionStatus: string;
  startDate: string | null;
  endDate: string | null;
  logo1: string | null;
  logo2: string | null;
}

const settingsSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  electionTitle: z.string().min(1, "Election title is required"),
  electionStatus: z.enum(["active", "inactive", "scheduled"]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  logo1: z.string().optional().nullable(),
  logo2: z.string().optional().nullable(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logo1FileRef = useRef<HTMLInputElement>(null);
  const logo2FileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  const { data: settings, isLoading } = useQuery<SchoolSettings>({
    queryKey: ["/api/settings"],
    enabled: !!user && isAdmin,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      schoolName: "",
      electionTitle: "",
      electionStatus: "inactive",
      startDate: null,
      endDate: null,
      logo1: null,
      logo2: null,
    },
  });

  // Reset form when settings data is loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        schoolName: settings.schoolName,
        electionTitle: settings.electionTitle,
        electionStatus: settings.electionStatus as "active" | "inactive" | "scheduled",
        startDate: settings.startDate,
        endDate: settings.endDate,
        logo1: settings.logo1,
        logo2: settings.logo2,
      });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  const handleLogo1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you would upload the file to a server
    // For this demo, we'll just use a fake URL to demonstrate the concept
    const fakeUrl = URL.createObjectURL(file);
    form.setValue("logo1", fakeUrl);
    toast({
      title: "Logo 1 selected",
      description: "In a real app, this would be uploaded to the server.",
    });
  };

  const handleLogo2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you would upload the file to a server
    // For this demo, we'll just use a fake URL to demonstrate the concept
    const fakeUrl = URL.createObjectURL(file);
    form.setValue("logo2", fakeUrl);
    toast({
      title: "Logo 2 selected",
      description: "In a real app, this would be uploaded to the server.",
    });
  };

  const isoToLocalDateTime = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Format: YYYY-MM-DDThh:mm
    return date.toISOString().slice(0, 16);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-medium mb-6">Settings</h1>

      {isLoading ? (
        <div>Loading settings...</div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-medium">Login Page Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="logo1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo 1</FormLabel>
                          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center">
                            {field.value ? (
                              <img src={field.value} alt="Logo 1" className="h-16 mb-2 object-contain" />
                            ) : (
                              <div className="h-16 mb-2 flex items-center justify-center text-gray-400">
                                No logo uploaded
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              ref={logo1FileRef}
                              onChange={handleLogo1Change}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => logo1FileRef.current?.click()}
                            >
                              {field.value ? "Replace Logo" : "Upload Logo"}
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="logo2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo 2</FormLabel>
                          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center">
                            {field.value ? (
                              <img src={field.value} alt="Logo 2" className="h-16 mb-2 object-contain" />
                            ) : (
                              <div className="h-16 mb-2 flex items-center justify-center text-gray-400">
                                No logo uploaded
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              ref={logo2FileRef}
                              onChange={handleLogo2Change}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => logo2FileRef.current?.click()}
                            >
                              {field.value ? "Replace Logo" : "Upload Logo"}
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium">General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter school name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="electionTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Election Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter election title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="electionStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Election Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select election status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Voting Period</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-500">Start Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field}
                                value={field.value ? isoToLocalDateTime(field.value) : ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value) {
                                    // Convert to ISO string for proper server format
                                    const date = new Date(value);
                                    field.onChange(date.toISOString());
                                  } else {
                                    field.onChange(null);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-500">End Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field}
                                value={field.value ? isoToLocalDateTime(field.value) : ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value) {
                                    // Convert to ISO string for proper server format
                                    const date = new Date(value);
                                    field.onChange(date.toISOString());
                                  } else {
                                    field.onChange(null);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending || !form.formState.isDirty}
                    >
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}
    </AdminLayout>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoadingAnimation from "@/components/LoadingAnimation";

// Define the shape of school settings data
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

const loginSchema = z.object({
  name: z.string().min(1, "Name is required"),
  referenceNumber: z.string().min(1, "Reference number is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isAdmin, refreshUser } = useAuth();
  
  // Fetch school settings for logos and title
  const { data: schoolSettings, isLoading: loadingSettings } = useQuery<SchoolSettings>({
    queryKey: ['/api/settings'],
    queryFn: getQueryFn<SchoolSettings>({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        setLocation("/admin");
      } else if (!user.schoolLevel || !user.gradeLevel) {
        setLocation("/school-level");
      } else {
        setLocation("/voting");
      }
    }
  }, [user, isAdmin, setLocation]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      name: "",
      referenceNumber: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      refreshUser();
      
      if (data.isAdmin) {
        setLocation("/admin");
      } else if (!data.schoolLevel || !data.gradeLevel) {
        setLocation("/school-level");
      } else {
        setLocation("/voting");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: LoginValues) {
    loginMutation.mutate(data);
  }

  // Show loading animation while fetching settings
  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center mb-8 gap-3">
            {/* School logo on the left of the title */}
            {schoolSettings?.logo1 ? (
              <img
                src={schoolSettings.logo1}
                alt="School Logo 1"
                className="h-12 object-contain"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-400">Logo</span>
              </div>
            )}
            
            <h1 className="text-2xl font-medium text-gray-800">
              {schoolSettings?.electionTitle || "ARSC Voting System"}
            </h1>
            
            {/* School logo on the right of the title */}
            {schoolSettings?.logo2 ? (
              <img
                src={schoolSettings.logo2}
                alt="School Logo 2"
                className="h-12 object-contain"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-400">Logo</span>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
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
                      <Input placeholder="Enter your reference number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-primary" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Log In"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Please enter your credentials to continue</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

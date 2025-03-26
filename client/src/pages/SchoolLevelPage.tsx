import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const schoolLevelSchema = z.object({
  schoolLevel: z.enum(["elementary", "juniorHigh", "seniorHigh"], {
    required_error: "School level is required",
  }),
  gradeLevel: z.number({
    required_error: "Grade level is required",
  }).int().min(3).max(12),
});

type SchoolLevelValues = z.infer<typeof schoolLevelSchema>;

export default function SchoolLevelPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const [availableGrades, setAvailableGrades] = useState<number[]>([]);

  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (user.schoolLevel && user.gradeLevel) {
      setLocation("/voting");
    }
  }, [user, setLocation]);

  const form = useForm<SchoolLevelValues>({
    resolver: zodResolver(schoolLevelSchema),
    defaultValues: {
      schoolLevel: undefined,
      gradeLevel: undefined,
    },
  });

  const schoolLevelMutation = useMutation({
    mutationFn: async (data: SchoolLevelValues) => {
      const res = await apiRequest("POST", "/api/students/select-level", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "School level selected successfully",
      });
      refreshUser();
      setLocation("/voting");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to select school level",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: SchoolLevelValues) {
    schoolLevelMutation.mutate(data);
  }

  // Update available grades based on school level
  const watchSchoolLevel = form.watch("schoolLevel");
  
  useEffect(() => {
    if (watchSchoolLevel === "elementary") {
      setAvailableGrades([3, 4, 5, 6]);
    } else if (watchSchoolLevel === "juniorHigh") {
      setAvailableGrades([7, 8, 9, 10]);
    } else if (watchSchoolLevel === "seniorHigh") {
      setAvailableGrades([11, 12]);
    } else {
      setAvailableGrades([]);
    }
    
    // Reset grade level when school level changes
    form.setValue("gradeLevel", undefined as any);
  }, [watchSchoolLevel, form]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-medium text-center text-gray-800 mb-6">Select Your School Level</h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="schoolLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select school level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="elementary">Elementary</SelectItem>
                        <SelectItem value="juniorHigh">Junior High School</SelectItem>
                        <SelectItem value="seniorHigh">Senior High School</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                      disabled={!watchSchoolLevel || availableGrades.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableGrades.map((grade) => (
                          <SelectItem key={grade} value={grade.toString()}>
                            Grade {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-primary" 
                disabled={schoolLevelMutation.isPending || !form.formState.isValid}
              >
                {schoolLevelMutation.isPending ? "Processing..." : "Continue to Voting"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

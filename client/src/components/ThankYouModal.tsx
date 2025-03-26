import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";

interface ThankYouModalProps {
  isOpen: boolean;
}

export default function ThankYouModal({ isOpen }: ThankYouModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="text-center">
        <div className="text-green-500 mb-4 flex justify-center">
          <CheckCircle className="h-16 w-16" />
        </div>
        
        <DialogTitle className="text-2xl font-medium mb-4">Thank You For Voting!</DialogTitle>
        
        <DialogDescription className="mb-6">
          Your votes have been successfully recorded. You will be logged out in a few seconds.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

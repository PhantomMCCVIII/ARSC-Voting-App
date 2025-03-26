import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Candidate {
  id: number;
  name: string;
  photo: string;
  positionId: number;
  partylistId: number;
  schoolLevels: string[];
  gradeLevels: number[];
}

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
  platformImage?: string;
  groupPhoto?: string;
}

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  candidate: Candidate;
  position: Position;
  partylist?: Partylist;
  isPending: boolean;
}

export default function VoteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  candidate,
  position,
  partylist,
  isPending,
}: VoteConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Your Vote</DialogTitle>
          <DialogDescription>
            You are about to vote for{" "}
            <span className="font-medium">{candidate.name}</span>
            {partylist && <span> ({partylist.name})</span>}
            {" "}for{" "}
            <span className="font-medium">{position.name}</span>.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          {candidate.photo ? (
            <img 
              src={candidate.photo} 
              alt={candidate.name} 
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-2xl border-4 border-primary/20">
              {candidate.name.charAt(0)}
            </div>
          )}
          <div className="text-center">
            <h3 className="text-lg font-semibold">{candidate.name}</h3>
            <p className="text-sm text-gray-600">{partylist?.name || "Independent"}</p>
            <p className="text-sm font-medium mt-2">Position: {position.name}</p>
          </div>
        </div>

        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? "Processing..." : "Confirm Vote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

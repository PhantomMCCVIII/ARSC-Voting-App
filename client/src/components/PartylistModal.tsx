import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Partylist {
  id: number;
  name: string;
  color: string;
  logo: string;
  platformImage: string;
  groupPhoto: string;
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

interface Position {
  id: number;
  name: string;
  maxVotes: number;
  schoolLevels: string[];
  displayOrder: number;
}

interface PartylistModalProps {
  partylist: Partylist;
  candidates: Candidate[];
  positions: Position[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PartylistModal({
  partylist,
  candidates,
  positions,
  isOpen,
  onClose,
}: PartylistModalProps) {
  // Group candidates by position
  const candidatesByPosition = candidates.reduce((acc, candidate) => {
    const positionId = candidate.positionId;
    if (!acc[positionId]) {
      acc[positionId] = [];
    }
    acc[positionId].push(candidate);
    return acc;
  }, {} as Record<number, Candidate[]>);

  // Get position name by ID
  const getPositionName = (positionId: number) => {
    const position = positions.find(p => p.id === positionId);
    return position ? position.name : "Unknown Position";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{partylist.name}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="mb-8">
          <h3 className="text-xl font-medium mb-4">Our Platform</h3>
          <div className="border rounded-lg overflow-hidden">
            {partylist.platformImage ? (
              <img 
                src={partylist.platformImage} 
                alt={`${partylist.name} Platform`} 
                className="w-full h-auto"
              />
            ) : (
              <div className="w-full h-60 bg-gray-100 flex items-center justify-center text-gray-400">
                Platform image not available
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-medium mb-4">Meet Our Candidates</h3>
          <div className="border rounded-lg overflow-hidden mb-6">
            {partylist.groupPhoto ? (
              <img 
                src={partylist.groupPhoto} 
                alt={`${partylist.name} Candidates`} 
                className="w-full h-auto"
              />
            ) : (
              <div className="w-full h-60 bg-gray-100 flex items-center justify-center text-gray-400">
                Group photo not available
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {Object.entries(candidatesByPosition).map(([positionId, candidates]) => (
              candidates.map((candidate) => (
                <div key={candidate.id} className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium">{getPositionName(Number(positionId))}</h4>
                  <p>{candidate.name}</p>
                </div>
              ))
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

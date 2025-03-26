import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PartylistModal from "@/components/PartylistModal";
import VoteConfirmationModal from "@/components/VoteConfirmationModal";
import ThankYouModal from "@/components/ThankYouModal";

interface Partylist {
  id: number;
  name: string;
  color: string;
  logo: string;
  platformImage: string;
  groupPhoto: string;
}

interface Position {
  id: number;
  name: string;
  maxVotes: number;
  schoolLevels: string[];
  displayOrder: number;
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

export default function VotingPage() {
  const { user, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for modals
  const [isPartylistModalOpen, setIsPartylistModalOpen] = useState(false);
  const [selectedPartylist, setSelectedPartylist] = useState<Partylist | null>(null);
  const [isVoteConfirmationOpen, setIsVoteConfirmationOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{ candidate: Candidate; position: Position } | null>(null);
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);
  const [showVotingSection, setShowVotingSection] = useState(false);
  
  // Track votes for each position
  const [votes, setVotes] = useState<Record<number, number>>({});
  // Track if a user can submit all votes
  const [canSubmitAllVotes, setCanSubmitAllVotes] = useState(false);

  // Ensure user is authenticated and has selected school level
  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (!user.schoolLevel || !user.gradeLevel) {
      setLocation("/school-level");
    }
  }, [user, setLocation]);

  // Fetch partylists
  const partylistsQuery = useQuery({
    queryKey: ["/api/partylists"],
    enabled: !!user,
  });

  // Fetch positions
  const positionsQuery = useQuery({
    queryKey: ["/api/positions"],
    enabled: !!user,
  });

  // Fetch candidates
  const candidatesQuery = useQuery({
    queryKey: ["/api/candidates"],
    enabled: !!user && !!user.schoolLevel && !!user.gradeLevel,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ candidateId, positionId }: { candidateId: number; positionId: number }) => {
      const res = await apiRequest("POST", "/api/votes", { candidateId, positionId });
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Update votes state
      setVotes(prev => ({
        ...prev,
        [variables.positionId]: variables.candidateId
      }));

      // Check if all positions are voted
      const positions = positionsQuery.data as Position[] || [];
      const relevantPositions = positions.filter(pos => 
        pos.schoolLevels.includes(user?.schoolLevel || "")
      );
      
      const allVoted = relevantPositions.every(pos => votes[pos.id] !== undefined);
      
      setCanSubmitAllVotes(allVoted);
      
      // Close confirmation modal
      setIsVoteConfirmationOpen(false);
      
      toast({
        title: "Vote recorded",
        description: "Your vote has been successfully recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  // Handle view partylist details
  const handleViewPartylist = (partylist: Partylist) => {
    setSelectedPartylist(partylist);
    setIsPartylistModalOpen(true);
  };

  // Handle candidate selection
  const handleCandidateSelect = (candidate: Candidate, position: Position) => {
    setSelectedCandidate({ candidate, position });
    setIsVoteConfirmationOpen(true);
  };

  // Handle vote confirmation
  const handleConfirmVote = () => {
    if (selectedCandidate) {
      voteMutation.mutate({
        candidateId: selectedCandidate.candidate.id,
        positionId: selectedCandidate.position.id
      });
    }
  };

  // Handle done voting
  const handleDoneVoting = () => {
    setIsThankYouModalOpen(true);
    
    // Auto logout after 3 seconds
    setTimeout(() => {
      refreshUser();
      handleLogout();
    }, 3000);
  };

  // Get partylists with candidates
  const partylists = partylistsQuery.data as Partylist[] || [];
  const positions = positionsQuery.data as Position[] || [];
  const candidates = candidatesQuery.data as Candidate[] || [];

  // Filter positions by school level
  const filteredPositions = positions.filter(pos => 
    pos.schoolLevels.includes(user?.schoolLevel || "")
  );

  // Filter candidates by school and grade level
  const filteredCandidates = candidates.filter(c => 
    c.schoolLevels.includes(user?.schoolLevel || "") && 
    c.gradeLevels.includes(user?.gradeLevel || 0)
  );

  // Get candidates by position
  const getCandidatesByPosition = (positionId: number) => 
    filteredCandidates.filter(c => c.positionId === positionId);

  // Get partylist by ID
  const getPartylistById = (id: number) => 
    partylists.find(p => p.id === id);

  // Check if all positions have votes
  useEffect(() => {
    if (filteredPositions.length > 0) {
      const allVoted = filteredPositions.every(pos => votes[pos.id] !== undefined);
      setCanSubmitAllVotes(allVoted);
    }
  }, [votes, filteredPositions]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-neutral">
      {/* Header */}
      <header className="w-full bg-white shadow-md p-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-medium">{user.name}</h1>
          <p className="text-sm text-gray-600">
            Grade {user.gradeLevel} - {user.schoolLevel === "elementary" 
              ? "Elementary" 
              : user.schoolLevel === "juniorHigh" 
                ? "Junior High School" 
                : "Senior High School"}
          </p>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-primary">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </header>

      {/* Meet Your Partylist Section */}
      {!showVotingSection && (
        <Card className="w-full max-w-5xl mb-8">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-medium text-center mb-6">Meet Your Partylists</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partylistsQuery.isLoading ? (
                <p className="col-span-3 text-center">Loading partylists...</p>
              ) : partylistsQuery.isError ? (
                <p className="col-span-3 text-center text-red-500">Error loading partylists</p>
              ) : partylists.length === 0 ? (
                <p className="col-span-3 text-center">No partylists available</p>
              ) : (
                partylists.map((partylist) => (
                  <div 
                    key={partylist.id} 
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div 
                      className="h-32 flex items-center justify-center" 
                      style={{ backgroundColor: partylist.color || '#3F51B5' }}
                    >
                      {partylist.logo ? (
                        <img src={partylist.logo} alt={`${partylist.name} Logo`} className="h-20 object-contain" />
                      ) : (
                        <div className="h-20 w-20 flex items-center justify-center text-white text-2xl font-bold">
                          {partylist.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xl font-medium">{partylist.name}</h3>
                      <p className="text-gray-600 mt-2">Click to learn more about our platform and meet our candidates.</p>
                      <Button 
                        className="mt-4 w-full bg-secondary" 
                        onClick={() => handleViewPartylist(partylist)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="text-center mt-8">
              <Button 
                className="bg-primary text-white px-6 py-3 rounded-md hover:bg-opacity-90 font-medium text-lg"
                onClick={() => setShowVotingSection(true)}
              >
                Ready to Vote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Section */}
      {showVotingSection && (
        <Card className="w-full max-w-5xl mb-8">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-medium text-center mb-6">Cast Your Vote</h2>
            
            {positionsQuery.isLoading || candidatesQuery.isLoading ? (
              <p className="text-center">Loading...</p>
            ) : positionsQuery.isError || candidatesQuery.isError ? (
              <p className="text-center text-red-500">Error loading voting data</p>
            ) : filteredPositions.length === 0 ? (
              <p className="text-center">No positions available for your school level</p>
            ) : (
              <>
                {filteredPositions.map((position) => {
                  const positionCandidates = getCandidatesByPosition(position.id);
                  const hasVoted = votes[position.id] !== undefined;
                  
                  return (
                    <div key={position.id} className="position-section mb-8 pb-6 border-b border-gray-200">
                      <h3 className="text-xl font-medium mb-4">{position.name}</h3>
                      <p className="text-gray-600 mb-4">Vote for {position.maxVotes} candidate{position.maxVotes > 1 ? 's' : ''}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {positionCandidates.length === 0 ? (
                          <p className="col-span-3">No candidates available for this position</p>
                        ) : (
                          positionCandidates.map((candidate) => {
                            const partylist = getPartylistById(candidate.partylistId);
                            const isSelected = votes[position.id] === candidate.id;
                            const isDisabled = hasVoted && !isSelected;
                            
                            return (
                              <div 
                                key={candidate.id} 
                                className={`flex flex-col items-center p-4 border rounded-lg hover:border-primary ${
                                  isDisabled ? 'opacity-50' : ''
                                } ${isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-gray-200'}`}
                              >
                                <div className="relative mb-3">
                                  {candidate.photo ? (
                                    <img 
                                      src={candidate.photo} 
                                      alt={candidate.name} 
                                      className="w-24 h-24 rounded-full object-cover" 
                                    />
                                  ) : (
                                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                                      <span className="text-2xl font-semibold text-gray-600">
                                        {candidate.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div 
                                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-300 cursor-pointer"
                                    onClick={() => {
                                      if (!isDisabled) {
                                        handleCandidateSelect(candidate, position);
                                      }
                                    }}
                                  >
                                    <div 
                                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        isSelected ? 'bg-primary text-white' : 'border-2 border-gray-400'
                                      }`}
                                    >
                                      {isSelected && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <h4 className="text-lg font-medium">{candidate.name}</h4>
                                <p className="text-sm text-gray-600">{partylist?.name || "Independent"}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Done Voting Button */}
                <div className="text-center mt-8">
                  <Button 
                    className="bg-success text-white px-6 py-3 rounded-md hover:bg-opacity-90 font-medium text-lg"
                    disabled={!canSubmitAllVotes}
                    onClick={handleDoneVoting}
                  >
                    Done Voting
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Partylist Modal */}
      {selectedPartylist && (
        <PartylistModal 
          partylist={selectedPartylist}
          isOpen={isPartylistModalOpen}
          onClose={() => setIsPartylistModalOpen(false)}
          candidates={filteredCandidates.filter(c => c.partylistId === selectedPartylist.id)}
          positions={positions}
        />
      )}

      {/* Vote Confirmation Modal */}
      {selectedCandidate && (
        <VoteConfirmationModal
          isOpen={isVoteConfirmationOpen}
          onClose={() => setIsVoteConfirmationOpen(false)}
          onConfirm={handleConfirmVote}
          candidate={selectedCandidate.candidate}
          position={selectedCandidate.position}
          partylist={getPartylistById(selectedCandidate.candidate.partylistId)}
          isPending={voteMutation.isPending}
        />
      )}

      {/* Thank You Modal */}
      <ThankYouModal 
        isOpen={isThankYouModalOpen}
      />
    </div>
  );
}

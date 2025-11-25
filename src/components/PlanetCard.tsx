import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe, Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";

interface PlanetCardProps {
  id: string;
  name: string;
  status: string;
  population?: number;
  coverage?: number;
  isLocked?: boolean;
  systemId: string;
}

export const PlanetCard = ({ 
  id, 
  name, 
  status, 
  population = 0, 
  coverage = 0, 
  isLocked = false,
  systemId 
}: PlanetCardProps) => {
  return (
    <Card className="glass border-primary/30 hover:border-primary/60 transition-all relative overflow-hidden">
      {isLocked && (
        <div className="absolute inset-0 backdrop-blur-sm bg-background/50 flex items-center justify-center z-10">
          <div className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Locked</p>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/30">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{name}</h3>
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          </div>
          {!isLocked && (
            <Unlock className="h-5 w-5 text-accent" />
          )}
        </div>

        {!isLocked && (
          <div className="space-y-4 mb-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Population</span>
                <span className="text-foreground font-medium">{population}%</span>
              </div>
              <Progress value={population} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Coverage</span>
                <span className="text-foreground font-medium">{coverage}%</span>
              </div>
              <Progress value={coverage} className="h-2" />
            </div>
          </div>
        )}

        <Link to={`/star-system/${systemId}/planet/${id}`}>
          <Button 
            variant={isLocked ? "outline" : "default"} 
            className="w-full"
            disabled={isLocked}
          >
            {isLocked ? "Locked" : "Enter Planet"}
          </Button>
        </Link>
      </div>
    </Card>
  );
};

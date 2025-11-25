import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface StarSystemCardProps {
  id: string;
  name: string;
  description: string;
  planetCount: number;
  image?: string;
}

export const StarSystemCard = ({ id, name, description, planetCount }: StarSystemCardProps) => {
  return (
    <Card className="glass border-animated hover:shadow-glow-card transition-all cursor-pointer group overflow-hidden">
      <div className="relative h-48 bg-gradient-glow overflow-hidden">
        <div className="absolute inset-0 bg-gradient-cosmic opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Globe className="h-24 w-24 text-primary glow-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full">
          <span className="text-xs font-medium">{planetCount} Planets</span>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-2xl font-bold mb-2 bg-gradient-cosmic bg-clip-text text-transparent">
          {name}
        </h3>
        <p className="text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>
        
        <Link to={`/star-system/${id}`}>
          <Button variant="default" className="w-full group/btn">
            Explore System
            <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

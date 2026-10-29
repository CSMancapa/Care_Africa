import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/config/supabase";
import { useState } from "react";
import { toast } from "sonner";

export const OnboardingCard = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  const handleSetupClick = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('practices')
        .update({ setup_completed: true })
        .eq('id', session.user.id);

      if (error) throw error;
      
      setIsVisible(false);
      navigate("/settings");
    } catch (error) {
      toast.error("Failed to update setup status");
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm text-primary font-medium">Complete your practice setup to unlock all features</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80 gap-2"
          onClick={handleSetupClick}
        >
          Complete Setup <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}; 
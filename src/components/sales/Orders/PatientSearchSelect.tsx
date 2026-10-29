import React, { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { Patient } from "@/types/patient";
import { supabase } from "@/config/supabase";

interface PatientSearchSelectProps {
  value?: string;
  onChange: (value: string) => void;
}

const searchPatients = async (searchTerm: string): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .limit(10);
  
  if (error) throw error;
  return data || [];
};

export function PatientSearchSelect({ value, onChange }: PatientSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients", searchTerm],
    queryFn: () => searchPatients(searchTerm),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? patients?.find((patient) => patient.id === value)?.name
            : "Select member..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Search members..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : (
              "No member found."
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto p-2">
            {patients?.map((patient) => (
              <CommandItem
                key={patient.id}
                value={patient.id}
                onSelect={() => {
                  onChange(patient.id);
                  setOpen(false);
                }}
                className="cursor-pointer rounded-lg hover:bg-secondary/20 p-2"
              >
                <div className="flex items-start space-x-4 w-full">
                  <Avatar className="h-10 w-10">
                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                      {patient.name?.charAt(0)}
                    </div>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{patient.name}</p>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === patient.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>{patient.email}</span>
                      {patient.contact_number && (
                        <span>{patient.contact_number}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 
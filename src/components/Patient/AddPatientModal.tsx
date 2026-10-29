import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Phone, 
  Mail,
  Calendar,
  ChevronRight 
} from "lucide-react";
import { useCurrentPractice } from '@/hooks/useCurrentPractice';
import { toast } from 'react-hot-toast';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (patientData: any) => void;
  onSuccess: () => Promise<void>;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const practiceId = useCurrentPractice();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: '',
    dateOfBirth: '',
    gender: '',
    status: 'active',
    points: 0,
    practice_id: practiceId
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) {
      toast.error("Practice authentication required");
      return;
    }
    onAdd({ ...formData, practice_id: practiceId });
    onClose();
    setFormData({
      name: '',
      email: '',
      contact_number: '',
      dateOfBirth: '',
      gender: '',
      status: 'active',
      points: 0,
      practice_id: practiceId
    });
  };

  return (
    <Modal open={isOpen}>
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle className="text-2xl">Add New Patient</ModalTitle>
          </ModalHeader>

          <div className="grid gap-6 p-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter patient name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact_number" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gender" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Gender
                  </Label>
                  <Select 
                    value={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="gap-2"
            >
              Add Member
              <ChevronRight className="w-4 h-4" />
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AddPatientModal; 
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const createPractice = async (req: Request, res: Response) => {
  const {
    practiceName,
    email,
    address,
    phone,
    displayPicture,
    businessHours,
    specialties,
    doctors,
    selectedRewardCampaigns,
    pointsRules
  }: {
    practiceName: string;
    email: string;
    address: string;
    phone: string;
    displayPicture: string;
    businessHours: Record<string, { start: string; end: string; isOpen: boolean }>;
    specialties: string[];
    doctors: Array<{
      name: string;
      specialization: string;
      availability: Record<string, {
        isAvailable: boolean;
        usePracticeHours: boolean;
        customHours?: { start: string; end: string };
      }>;
    }>;
    selectedRewardCampaigns: string[];
    pointsRules: {
      perVisit: number;
      perReferral: number;
      perReview: number;
    };
  } = req.body;

  try {
    // Start a Supabase transaction
    const { data: practice, error: practiceError } = await supabase
      .from('practices')
      .insert({
        practice_name: practiceName,
        email,
        address,
        phone,
        display_picture: displayPicture
      })
      .select()
      .single();

    if (practiceError) throw practiceError;

    // Insert business hours
    const businessHoursData = Object.entries(businessHours).map(([day, hours]) => ({
      practice_id: practice.id,
      day,
      start_time: hours.start,
      end_time: hours.end,
      is_open: hours.isOpen
    }));

    const { error: hoursError } = await supabase
      .from('business_hours')
      .insert(businessHoursData);

    if (hoursError) throw hoursError;

    // Insert specialties
    const specialtiesData = specialties.map(specialty => ({
      practice_id: practice.id,
      specialty
    }));

    const { error: specialtiesError } = await supabase
      .from('practice_specialties')
      .insert(specialtiesData);

    if (specialtiesError) throw specialtiesError;

    // Insert doctors and their availability
    for (const doctor of doctors) {
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert({
          practice_id: practice.id,
          name: doctor.name,
          specialization: doctor.specialization
        })
        .select()
        .single();

      if (doctorError) throw doctorError;

      const availabilityData = Object.entries(doctor.availability).map(([day, availability]) => ({
        doctor_id: doctorData.id,
        day,
        is_available: availability.isAvailable,
        use_practice_hours: availability.usePracticeHours,
        custom_start_time: availability.customHours?.start,
        custom_end_time: availability.customHours?.end
      }));

      const { error: availabilityError } = await supabase
        .from('doctor_availability')
        .insert(availabilityData);

      if (availabilityError) throw availabilityError;
    }

    // Insert reward campaigns
    const campaignsData = selectedRewardCampaigns.map(campaign => ({
      practice_id: practice.id,
      campaign_name: campaign
    }));

    const { error: campaignsError } = await supabase
      .from('reward_campaigns')
      .insert(campaignsData);

    if (campaignsError) throw campaignsError;

    // Insert points rules
    const { error: pointsError } = await supabase
      .from('points_rules')
      .insert({
        practice_id: practice.id,
        points_per_visit: pointsRules.perVisit,
        points_per_referral: pointsRules.perReferral,
        points_per_review: pointsRules.perReview
      });

    if (pointsError) throw pointsError;

    res.status(201).json({
      success: true,
      data: practice
    });

  } catch (error) {
    console.error('Error creating practice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create practice'
    });
  }
};

// Add this interface
interface AuthRequest extends Request {
  user: {
    _id: string;
    name: string;
    email: string;
    role: "doctor" | "admin" | "staff";
    specialization?: string;
  }
} 
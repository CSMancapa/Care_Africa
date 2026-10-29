import React, { useEffect, useRef } from 'react';
import { Input } from './ui/input';

interface AddressAutocompleteProps {
  onAddressSelect: (address: {
    address: string;
    city: string;
    province: string;
    postal_code: string;
  }) => void;
  defaultValue?: string;
}

export function AddressAutocomplete({ onAddressSelect, defaultValue = '' }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Google Maps may be unavailable (no API key, blocked, offline). Without it
    // the field still works as a plain text input instead of crashing the page.
    if (typeof google === 'undefined' || !google.maps?.places) return;

    // Initialize Google Maps Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ZA' }, // Restrict to South Africa
      fields: ['address_components', 'formatted_address'],
    });

    // Add listener for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (!place?.address_components) return;

      let addressData = {
        address: '',
        city: '',
        province: '',
        postal_code: '',
      };

      // Extract address components
      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number') || types.includes('route')) {
          addressData.address += component.long_name + ' ';
        }
        if (types.includes('locality')) {
          addressData.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          addressData.province = component.long_name;
        }
        if (types.includes('postal_code')) {
          addressData.postal_code = component.long_name;
        }
      });

      // Use formatted_address if street address is empty
      if (!addressData.address.trim() && place.formatted_address) {
        addressData.address = place.formatted_address;
      }

      onAddressSelect(addressData);
    });

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onAddressSelect]);

  return (
    <Input
      ref={inputRef}
      type="text"
      defaultValue={defaultValue}
      placeholder="Start typing your address..."
      className="w-full"
    />
  );
} 
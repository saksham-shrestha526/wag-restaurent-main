import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Settings {
  restaurantName: string;
  restaurantHours: string;
  restaurantPhone: string;
  restaurantAddress: string;
  taxRate: string;
  serviceCharge: string;
  currency: string;          // ← ADDED currency field
  map_url: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: Settings = {
  restaurantName: 'WAG Restaurant',
  restaurantHours: 'Mon-Sun: 5:00 PM - 11:00 PM',
  restaurantPhone: '+977 9824223305',
  restaurantAddress: 'Hetauda-07, Nagswoti',
  taxRate: '13',
  serviceCharge: '10',
  currency: 'USD',           // ← default USD
  map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3549.336140598854!2d85.02534837544837!3d27.323683076694692!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb4b4430e303db%3A0xc4767bd868bba15a!2sHetauda!5e0!3m2!1sen!2snp!4v1713510000000!5m2!1sen!2snp'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      
      // Merge with defaults to ensure all fields exist
      setSettings({
        restaurantName: data.restaurantName || defaultSettings.restaurantName,
        restaurantHours: data.restaurantHours || defaultSettings.restaurantHours,
        restaurantPhone: data.restaurantPhone || defaultSettings.restaurantPhone,
        restaurantAddress: data.restaurantAddress || defaultSettings.restaurantAddress,
        taxRate: data.taxRate || defaultSettings.taxRate,
        serviceCharge: data.serviceCharge || defaultSettings.serviceCharge,
        currency: data.currency || defaultSettings.currency,
        map_url: data.map_url || defaultSettings.map_url,
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      // Update local state immediately
      setSettings(prev => ({ ...prev, ...newSettings }));
      
      // Refresh from server to ensure consistency
      await fetchSettings();
      
      toast.success('Settings saved successfully', {
        description: 'Your changes have been applied.',
        duration: 3000,
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings', {
        description: error.message || 'Please try again.',
        duration: 4000,
      });
      return false;
    }
  }, [fetchSettings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
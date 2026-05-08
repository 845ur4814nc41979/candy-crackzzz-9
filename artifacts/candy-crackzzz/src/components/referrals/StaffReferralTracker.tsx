import { useEffect } from 'react';
import { captureStaffReferralFromCurrentUrl } from '@/lib/staffReferral';

export default function StaffReferralTracker() {
  useEffect(() => {
    captureStaffReferralFromCurrentUrl();
  }, []);

  return null;
}

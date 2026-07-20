import React from 'react';
import ProfileSettingsClient from '@/components/ProfileSettingsClient';

export const dynamic = 'force-dynamic';

export default function TeacherSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">View your profile details.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ProfileSettingsClient />
      </div>
    </div>
  );
}

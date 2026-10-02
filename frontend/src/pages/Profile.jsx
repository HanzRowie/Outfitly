import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="outfitly-app-shell">
      <Navbar />
      <main className="outfitly-home-container">
        <h1 className="outfitly-home-title">User Profile</h1>
        <p className="outfitly-home-lead">
          {user ? `Profile for @${user.username} (${user.email})` : 'Please sign in to view your profile.'}
        </p>
      </main>
    </div>
  );
};

export default Profile;

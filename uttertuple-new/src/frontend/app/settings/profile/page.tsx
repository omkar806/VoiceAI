'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { useTheme } from "@/contexts/ThemeContext";
import { X, Building, Mail, User, Key, ShieldCheck } from "lucide-react";
import { getOrganizationId } from "@/services/apiConfig";

const ProfileSettings = () => {
  const { user, refreshUserProfile } = useAuth();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        full_name: user.full_name || "",
        email: user.email || "",
      }));
    }
    
    // Get organization ID from localStorage or cookies
    const orgId = getOrganizationId();
    setOrganizationId(orgId);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Check if passwords are provided and matching
      if (formData.new_password || formData.current_password) {
        if (formData.new_password !== formData.confirm_password) {
          setMessage({ type: "error", text: "New passwords do not match." });
          setLoading(false);
          return;
        }

        if (formData.new_password.length < 8) {
          setMessage({
            type: "error",
            text: "Password must be at least 8 characters long.",
          });
          setLoading(false);
          return;
        }

        // Update password if provided
        if (formData.current_password && formData.new_password) {
          try {
            await authService.changePassword({
              current_password: formData.current_password,
              new_password: formData.new_password,
            });
          } catch (error: any) {
            console.error("Password update error:", error);
            throw new Error(
              error.response?.data?.detail || "Failed to update password"
            );
          }
        }
      }

      // Update profile information if changed
      if (user?.full_name !== formData.full_name) {
        await authService.updateProfile({
          full_name: formData.full_name,
        });
      }

      // Refresh user profile data to update displayed information across the app
      await refreshUserProfile();

      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });

      // Reset password fields
      setFormData((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));

      // Navigate back to settings after successful update
      setTimeout(() => {
        router.push("/settings");
      }, 1500);
    } catch (error: any) {
      console.error("Profile update error:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className={`max-w-3xl mx-auto p-6 ${darkMode ? "text-white" : ""}`}>
        <div className="flex justify-between items-center mb-6">
          <h1
            className={`text-2xl font-bold ${
              darkMode ? "text-white" : "text-neutral-800"
            }`}
          >
            Profile Settings
          </h1>
        </div>

        {message.text && (
          <div
            className={`p-4 mb-6 rounded-md ${
              message.type === "success"
                ? darkMode
                  ? "bg-green-900/30 text-green-400 border border-green-800"
                  : "bg-green-50 text-green-700 border border-green-200"
                : darkMode
                ? "bg-red-900/30 text-red-400 border border-red-800"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div
          className={`rounded-lg shadow-sm border p-6 mb-6 ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2
              className={`text-lg font-medium items-center ${
                darkMode ? "text-white" : "text-neutral-800"
              }`}
            >
              Account Information
            </h2>
            <button
              onClick={() => router.push("/settings")}
              className={`p-2 rounded-full hover:bg-opacity-80 transition-colors ${
                darkMode
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-neutral-100 text-neutral-600"
              }`}
            >
              <X size={24} />
            </button>
          </div>

          {/* Account Information Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`p-4 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center mb-3">
                <User className={`mr-2 ${darkMode ? "text-blue-400" : "text-blue-600"}`} size={18} />
                <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  User ID
                </span>
              </div>
              <p className={`text-sm break-all ${darkMode ? "text-white" : "text-gray-800"}`}>
                {user?.id || "Not available"}
              </p>
            </div>
            
            <div className={`p-4 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center mb-3">
                <Mail className={`mr-2 ${darkMode ? "text-blue-400" : "text-blue-600"}`} size={18} />
                <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Email Address
                </span>
              </div>
              <p className={`text-sm break-all ${darkMode ? "text-white" : "text-gray-800"}`}>
                {user?.email || "Not available"}
              </p>
            </div>
            
            <div className={`p-4 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center mb-3">
                <Building className={`mr-2 ${darkMode ? "text-blue-400" : "text-blue-600"}`} size={18} />
                <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Organization ID
                </span>
              </div>
              <p className={`text-sm break-all ${darkMode ? "text-white" : "text-gray-800"}`}>
                {organizationId || "Not available"}
              </p>
            </div>
            
            <div className={`p-4 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center mb-3">
                <ShieldCheck className={`mr-2 ${darkMode ? "text-blue-400" : "text-blue-600"}`} size={18} />
                <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Account Status
                </span>
              </div>
              <div className="flex items-center">
                <span 
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    user?.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></span>
                <p className={`text-sm ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {user?.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg shadow-sm border p-6 ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-neutral-200"
          }`}
        >
          <form onSubmit={handleProfileUpdate}>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2
                    className={`text-lg font-medium items-center ${
                      darkMode ? "text-white" : "text-neutral-800"
                    }`}
                  >
                    Personal Information
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="full_name"
                      className={`block text-sm font-medium mb-1 ${
                        darkMode ? "text-gray-300" : "text-neutral-700"
                      }`}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-neutral-300 placeholder-neutral-400"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className={`block text-sm font-medium mb-1 ${
                        darkMode ? "text-gray-300" : "text-neutral-700"
                      }`}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-neutral-300 placeholder-neutral-400"
                      }`}
                      required
                      disabled
                    />
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? "text-gray-400" : "text-neutral-500"
                      }`}
                    >
                      Email address cannot be changed
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div>
                <h2
                  className={`text-lg font-medium mb-4 ${
                    darkMode ? "text-white" : "text-neutral-800"
                  }`}
                >
                  Change Password
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="current_password"
                      className={`block text-sm font-medium mb-1 ${
                        darkMode ? "text-gray-300" : "text-neutral-700"
                      }`}
                    >
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="current_password"
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-neutral-300 placeholder-neutral-400"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new_password"
                      className={`block text-sm font-medium mb-1 ${
                        darkMode ? "text-gray-300" : "text-neutral-700"
                      }`}
                    >
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-neutral-300 placeholder-neutral-400"
                      }`}
                      minLength={8}
                    />
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? "text-gray-400" : "text-neutral-500"
                      }`}
                    >
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm_password"
                      className={`block text-sm font-medium mb-1 ${
                        darkMode ? "text-gray-300" : "text-neutral-700"
                      }`}
                    >
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-neutral-300 placeholder-neutral-400"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${
                    darkMode ? "hover:bg-primary-500" : ""
                  }`}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileSettings;




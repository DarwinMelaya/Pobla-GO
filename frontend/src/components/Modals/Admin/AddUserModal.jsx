import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

// Use the same base URL + verification flow as the public SignUp page
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    role: "Staff",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [emailForVerification, setEmailForVerification] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
      role: "Staff",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsVerificationStep(false);
    setVerificationCode("");
    setEmailForVerification("");
    setIsVerifying(false);
    setIsResending(false);
    setResendCooldown(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Object.values(formData).some((value) => !value)) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setIsSubmitting(true);

      // Mirror the SignUp flow so that creating a staff user from admin
      // also triggers the same verification behaviour.
      const response = await axios.post(
        `${API_BASE_URL}/auth/signup`,
        {
          ...formData,
          // Ensure role is explicitly set to Staff when created from this modal
          role: "Staff",
        },
        {
          headers: {
            ...authHeaders,
          },
        }
      );

      const data = response?.data || {};

      if (!data.success) {
        throw new Error(data?.message || "Failed to add user");
      }

      const userEmail = formData.email;

      if (data?.needsVerification) {
        toast.success(
          data?.message ||
            "Staff user created! A verification email has been sent."
        );
        setEmailForVerification(userEmail);
        setIsVerificationStep(true);
        setVerificationCode("");
        setResendCooldown(60);
      } else {
        toast.success(
          data?.message || "Staff user created successfully and verified."
        );
        resetForm();
        onClose?.();
        onUserAdded?.();
      }
    } catch (error) {
      console.error("Error creating user:", error);
      const message =
        error.response?.data?.message || error.message || "Error creating user";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code.");
      return;
    }

    try {
      setIsVerifying(true);

      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-email`,
        {
          email: emailForVerification,
          code: verificationCode.trim(),
        },
        {
          headers: {
            ...authHeaders,
          },
        }
      );

      const data = response?.data || {};

      if (!data.success) {
        throw new Error(data?.message || "Failed to verify email");
      }

      toast.success(data?.message || "Email verified! User can now log in.");
      resetForm();
      onClose?.();
      onUserAdded?.();
    } catch (error) {
      console.error("Verification error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to verify email";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!emailForVerification) {
      toast.error("No email found for verification.");
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    try {
      setIsResending(true);

      const response = await axios.post(
        `${API_BASE_URL}/auth/resend-verification`,
        { email: emailForVerification },
        {
          headers: {
            ...authHeaders,
          },
        }
      );

      const data = response?.data || {};

      if (!data.success) {
        throw new Error(data?.message || "Failed to resend code");
      }

      toast.success(
        data?.message || "Verification code resent! Check the inbox."
      );
      setResendCooldown(60);
    } catch (error) {
      console.error("Resend code error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to resend verification code";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-lg rounded-2xl bg-[#1f1f1f] shadow-2xl border border-[#383838] flex flex-col max-h-[90vh]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#383838] px-6 py-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Add Staff User
            </h2>
            <p className="text-sm text-[#b5b5b5]">
              Create an account for your staff member
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose?.();
            }}
            className="text-lg text-[#b5b5b5] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {isVerificationStep ? (
          <form
            onSubmit={handleVerificationSubmit}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
          >
            <div className="rounded-xl border border-[#383838] bg-[#232323] p-4">
              <p className="text-sm text-white">
                A verification code was sent to{" "}
                <span className="font-semibold">{emailForVerification}</span>.
                Share the code with your staff member and enter it below to
                activate the account.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                maxLength={6}
                inputMode="numeric"
                className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none tracking-[0.4em] text-center text-lg"
                placeholder="Enter 6-digit code"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className={`w-full px-5 py-3 rounded-lg font-semibold text-white transition-all ${
                isVerifying
                  ? "bg-[#3a3a3a] cursor-not-allowed"
                  : "bg-[#f6b100] hover:bg-[#d79a00]"
              }`}
            >
              {isVerifying ? "Verifying..." : "Verify Email"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending || resendCooldown > 0}
              className={`w-full px-5 py-2 rounded-lg border ${
                isResending || resendCooldown > 0
                  ? "border-white/30 text-white/60 cursor-not-allowed"
                  : "border-[#f6b100] text-[#f6b100] hover:bg-[#f6b100]/10"
              } transition-all`}
            >
              {isResending
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend Code in ${resendCooldown}s`
                : "Resend Code"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full px-4 py-2 rounded-lg border border-[#383838] text-[#b5b5b5] hover:text-white hover:border-[#f6b100] transition-colors"
              disabled={isVerifying}
            >
              Cancel Verification
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                Full Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none resize-none"
                placeholder="Enter full address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none pr-12"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-[#b5b5b5] hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#b5b5b5] mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#383838] bg-[#232323] px-4 py-3 text-white placeholder-[#707070] focus:border-[#f6b100] focus:outline-none pr-12"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-[#b5b5b5] hover:text-white"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#383838] bg-[#232323] p-4">
              <p className="text-sm font-medium text-white mb-2">
                Assigned Role
              </p>
              <p className="text-sm text-[#b5b5b5]">
                Staff members have access to reservation management tools.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white">
                  {formData.role}
                </span>
                <span className="text-xs text-[#b5b5b5]">
                  (Contact an admin to change role)
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose?.();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#383838] text-[#b5b5b5] hover:text-white hover:border-[#f6b100] transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-5 py-2 rounded-lg font-semibold text-white transition-all ${
                  isSubmitting
                    ? "bg-[#3a3a3a] cursor-not-allowed"
                    : "bg-[#f6b100] hover:bg-[#d79a00]"
                }`}
              >
                {isSubmitting ? "Creating..." : "Add Staff"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddUserModal;

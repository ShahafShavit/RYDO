import { useState } from 'react';
import FormField from '@/shared/components/ui/form-field/FormField';
import Input from '@/shared/components/ui/input/Input';
import Button from '@/shared/components/ui/button/Button';
import { validatePasswordForm } from '../schemas/account-schemas';
import { useChangePassword } from '../hooks/useAccount';

export const ChangePasswordForm = () => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState('');

    const { mutateAsync: changePassword, isLoading } = useChangePassword();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');

        const validationErrors = validatePasswordForm(formData);
        if (validationErrors) {
            setErrors(validationErrors);
            return;
        }

        try {
            await changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setSuccessMsg('Password changed successfully');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setErrors({ submit: err?.message || 'Failed to change password' });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md w-full">
            <div className="space-y-4">
                <FormField label="Current Password" error={errors.currentPassword}>
                    <Input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        placeholder="Enter current password"
                        disabled={isLoading}
                    />
                </FormField>

                <FormField label="New Password" error={errors.newPassword}>
                    <Input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="Enter new password (min 6 chars)"
                        disabled={isLoading}
                    />
                </FormField>

                <FormField label="Confirm New Password" error={errors.confirmPassword}>
                    <Input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm new password"
                        disabled={isLoading}
                    />
                </FormField>
            </div>

            {errors.submit && (
                <div className="text-red-500 text-sm mt-2">{errors.submit}</div>
            )}
            {successMsg && (
                <div className="text-success text-sm mt-2">{successMsg}</div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Update Password
            </Button>
        </form>
    );
};

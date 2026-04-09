export const passwordSchema = {
    currentPassword: {
        required: true,
        message: 'Current password is required'
    },
    newPassword: {
        required: true,
        minLength: 6,
        message: 'New password must be at least 6 characters'
    },
    confirmPassword: {
        required: true,
        message: 'Please confirm your new password'
    }
};

export const validatePasswordForm = (data) => {
    const errors = {};

    if (!data.currentPassword) {
        errors.currentPassword = passwordSchema.currentPassword.message;
    }

    if (!data.newPassword || data.newPassword.length < passwordSchema.newPassword.minLength) {
        errors.newPassword = passwordSchema.newPassword.message;
    }

    if (data.newPassword !== data.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }

    return Object.keys(errors).length > 0 ? errors : null;
};

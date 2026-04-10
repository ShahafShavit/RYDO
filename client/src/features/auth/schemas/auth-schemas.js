export const loginSchema = {
  email: { required: true },
  password: { required: true, minLength: 6 },
};

export const registerSchema = {
  firstName: {
    required: true,
    minLength: 2,
  },
  lastName: {
    required: true,
    minLength: 2,
  },
  email: {
    required: true,
    isEmail: true,
  },
  password: {
    required: true,
    minLength: 6,
  },
};

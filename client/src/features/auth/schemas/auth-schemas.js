export const loginSchema = {
  email: { required: true },
  password: { required: true, minLength: 6 },
};

export const registerSchema = {
  fullName: { required: true, minLength: 2 },
  email: { required: true },
  password: { required: true, minLength: 6 },
};

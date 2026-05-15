jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: { SERVER_URL: "http://192.168.1.180:3000" },
  },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

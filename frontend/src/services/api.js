import axios from "axios";

const api = axios.create({
  baseURL: "https://documind-ai-backend-6et6.onrender.com",
});

export default api;
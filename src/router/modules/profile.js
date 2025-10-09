import Profile from "@/views/profile/profile.vue";

export default [
  {
    path: "profile",
    name: "Profile",
    component: Profile,
    meta: { 
      title: "Thông tin cá nhân", 
      requiresAuth: true 
    },
  },
];

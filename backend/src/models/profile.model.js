function toMarketUser(profile) {
  return {
    id: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    surname: profile.surname,
    phone: profile.phone,
    secondaryPhone: profile.secondary_phone,
    province: profile.province,
    city: profile.city,
    approximateLocation: profile.approximate_location,
    role: profile.role,
    createdAt: profile.created_at,
  };
}

module.exports = { toMarketUser };

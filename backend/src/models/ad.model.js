function toApiAd(row) {
  const seller = row.profiles || row.seller;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    condition: row.condition,
    price: Number(row.price),
    images: row.images || [],
    contactPhone: row.contact_phone,
    province: row.province,
    city: row.city,
    approximateLocation: row.approximate_location,
    status: row.status,
    jobStatus: row.job_status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    views: row.views,
    seller: seller ? {
      id: seller.id || row.seller_id,
      username: seller.username,
      fullName: seller.full_name,
      surname: seller.surname,
      province: seller.province,
      city: seller.city,
      approximateLocation: seller.approximate_location,
      createdAt: seller.created_at,
    } : {
      id: row.seller_id,
      username: '',
      fullName: '',
      surname: null,
      province: '',
      city: '',
      approximateLocation: '',
      createdAt: '',
    },
  };
}

module.exports = { toApiAd };

const paginatedList = async (Model, req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  // Get query parameters
  const {
    sortBy = 'date',
    sortOrder = 'desc',
    filter,
    equal,
    type,
    partyType,
    dateFrom,
    dateTo
  } = req.query;

  const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

  // Build search query for text fields
  let searchQuery = {};
  if (fieldsArray.length > 0 && req.query.q) {
    searchQuery = { $or: [] };
    for (const field of fieldsArray) {
      searchQuery.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
    }
  }

  // Build filter query
  let filterQuery = {
    removed: false,
  };

  // Add type filter (Cash In / Cash Out)
  if (type) {
    filterQuery.type = type;
  }

  // Add partyType filter (Client / Supplier)
  if (partyType) {
    filterQuery.partyType = partyType;
  }

  // Add date range filter
  if (dateFrom || dateTo) {
    filterQuery.date = {};
    if (dateFrom) {
      filterQuery.date.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filterQuery.date.$lte = endDate;
    }
  }

  // Add existing filter/equal logic for backward compatibility
  if (filter && equal) {
    filterQuery[filter] = equal;
  }

  // Merge search query with filter query
  const finalQuery = { ...filterQuery, ...searchQuery };

  // Determine sort order
  const sortValue = sortOrder === 'asc' ? 1 : -1;

  // Query the database for a list of all results
  const resultsPromise = Model.find(finalQuery)
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortValue })
    .populate()
    .exec();

  // Counting the total documents
  const countPromise = Model.countDocuments(finalQuery);

  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);

  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };

  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: true,
      result: [],
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = paginatedList;

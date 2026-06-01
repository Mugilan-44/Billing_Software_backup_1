/**
 * tenant.utils.js
 * 
 * Centralized utility to ensure multi-tenant boundary checks
 * on single-resource fetches.
 */

/**
 * Safely find a document by ID, enforcing the user's company boundary.
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @param {string} id - The document ID
 * @param {Object} user - The req.user object containing role and companyId
 * @param {Object} [session] - Optional Mongoose session for transactions
 * @returns {Promise<import('mongoose').Document|null>}
 */
export const findDocument = async (Model, id, user, session = null) => {
  const query = { _id: id };
  
  // Enforce tenant boundary for all non-super-admins
  if (user.role !== 'SUPER_ADMIN') {
    if (!user.companyId) {
      throw new Error('User has no assigned companyId. Access denied.');
    }
    query.companyId = user.companyId;
  }

  let dbQuery = Model.findOne(query);
  if (session) {
    dbQuery = dbQuery.session(session);
  }

  return await dbQuery;
};

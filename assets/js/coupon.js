/**
 * Coupon — thin wrapper over Api for the Phase 18 student-facing coupon
 * endpoint (mirrors payments.js's own header exactly).
 *
 * CRITICAL ARCHITECTURE RULE (mirrors backend/src/services/coupon.service.js)
 * This file NEVER computes a discount or a final payable amount itself. It
 * only forwards { courseId, code } to POST /coupons/validate and returns
 * whatever the backend calculated (spec Step 17: "never trust frontend
 * discount" — that constraint cuts both ways; this file must not invent
 * numbers either). The figures shown here are for display only — the
 * actual purchase (Payments.purchaseCourse) always re-sends the raw
 * couponCode and lets the backend revalidate and recalculate from scratch
 * (spec Step 35, "stale coupon state").
 */

const Coupon = (() => {
  /**
   * @param {string} courseId
   * @param {string} code
   * @returns {Promise<{valid:boolean, coupon:{code:string,discountType:string}, originalAmount:number, discountAmount:number, finalAmount:number}>}
   */
  function validate(courseId, code) {
    return Api.post('/coupons/validate', { courseId, code });
  }

  return { validate };
})();

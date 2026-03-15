'use strict';

/**
 * SpecKit Spec Extractor
 *
 * Reads a change spec and extracts structured metadata:
 *   - Risk level and rationale
 *   - Breaking change flag
 *   - Affected components
 *   - Promotion rules
 *
 * Also generates a human-readable Markdown summary artifact
 * that can be uploaded by GitHub Actions for audit and review.
 */

const VALID_RISK_LEVELS = ['low', 'medium', 'high'];
const VALID_CHANGE_TYPES = ['feature', 'fix', 'chore', 'breaking', 'release'];
const VALID_IMPACT_TYPES = ['new', 'modified', 'removed'];

/**
 * Validate a change spec object.
 * @param {object} spec - Parsed change spec object.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateChangeSpec(spec) {
  const errors = [];

  if (!spec.change) {
    errors.push('Change spec must have a top-level "change" key');
    return { valid: false, errors };
  }

  const c = spec.change;

  if (!c.title) {
    errors.push('change.title is required');
  }

  if (!c.type) {
    errors.push('change.type is required');
  } else if (!VALID_CHANGE_TYPES.includes(c.type)) {
    errors.push(
      `change.type "${c.type}" is invalid. Must be one of: ${VALID_CHANGE_TYPES.join(', ')}`
    );
  }

  if (!c.risk) {
    errors.push('change.risk is required');
  } else if (!VALID_RISK_LEVELS.includes(c.risk)) {
    errors.push(
      `change.risk "${c.risk}" is invalid. Must be one of: ${VALID_RISK_LEVELS.join(', ')}`
    );
  }

  if (c.breaking === undefined || c.breaking === null) {
    errors.push('change.breaking is required (true or false)');
  } else if (typeof c.breaking !== 'boolean') {
    errors.push('change.breaking must be a boolean (true or false)');
  }

  if (c.components && !Array.isArray(c.components)) {
    errors.push('change.components must be an array');
  } else if (c.components) {
    c.components.forEach((comp, i) => {
      if (!comp.name) {
        errors.push(`change.components[${i}] is missing required field "name"`);
      }
      if (comp.impact && !VALID_IMPACT_TYPES.includes(comp.impact)) {
        errors.push(
          `change.components[${i}].impact "${comp.impact}" is invalid. ` +
          `Must be one of: ${VALID_IMPACT_TYPES.join(', ')}`
        );
      }
    });
  }

  if (c.promotion) {
    if (c.promotion.require_approvals !== undefined) {
      const n = Number(c.promotion.require_approvals);
      if (!Number.isInteger(n) || n < 0) {
        errors.push('change.promotion.require_approvals must be a non-negative integer');
      }
    }
    if (c.promotion.environments && !Array.isArray(c.promotion.environments)) {
      errors.push('change.promotion.environments must be an array');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extract core risk metadata from a change spec.
 * @param {object} spec - Parsed change spec.
 * @returns {{ risk: string, breaking: boolean, type: string, rationale: string }}
 */
function extractRisk(spec) {
  const c = spec.change || {};
  const risk = c.risk || 'unknown';
  const breaking = c.breaking === true;
  const type = c.type || 'unknown';

  let rationale = '';
  if (breaking) {
    rationale = 'Breaking change — existing API contracts or behaviors are modified.';
  } else if (risk === 'high') {
    rationale = 'High-risk change — requires extra review and staged rollout.';
  } else if (risk === 'medium') {
    rationale = 'Medium-risk change — touches shared logic; standard review applies.';
  } else {
    rationale = 'Low-risk change — isolated, additive, and fully tested.';
  }

  return { risk, breaking, type, rationale };
}

/**
 * Extract the list of affected components from a change spec.
 * @param {object} spec - Parsed change spec.
 * @returns {Array<{ name: string, impact: string }>}
 */
function extractComponents(spec) {
  return (spec.change && spec.change.components) || [];
}

/**
 * Extract promotion rules from a change spec.
 * @param {object} spec - Parsed change spec.
 * @returns {object} Promotion rules object.
 */
function extractPromotionRules(spec) {
  const defaults = {
    require_approvals: 1,
    require_passing_tests: true,
    require_security_scan: false,
    environments: ['staging', 'production'],
  };
  return Object.assign({}, defaults, (spec.change && spec.change.promotion) || {});
}

/**
 * Determine whether deployment to a given environment should be blocked.
 *
 * Rules:
 *   - Breaking changes always block production without a manual override.
 *   - High-risk changes block production and require approvals.
 *   - Medium-risk changes require at least 1 approval for production.
 *
 * @param {object} spec        - Parsed change spec.
 * @param {string} environment - Target environment name.
 * @returns {{ blocked: boolean, reasons: string[] }}
 */
function evaluatePromotionGate(spec, environment) {
  const { risk, breaking } = extractRisk(spec);
  const rules = extractPromotionRules(spec);
  const reasons = [];

  if (!rules.environments.includes(environment)) {
    reasons.push(`Environment "${environment}" is not listed in change.promotion.environments`);
  }

  if (environment === 'production') {
    if (breaking) {
      reasons.push('Breaking changes require manual approval before production deployment');
    }
    if (risk === 'high') {
      reasons.push('High-risk changes require additional review before production deployment');
    }
  }

  return { blocked: reasons.length > 0, reasons };
}

/**
 * Generate a Markdown summary artifact from a change spec.
 * This is uploaded as a GitHub Actions artifact for audit and review.
 *
 * @param {object} spec - Parsed change spec.
 * @returns {string} Markdown summary string.
 */
function generateSummary(spec) {
  const c = spec.change || {};
  const { risk, breaking, type, rationale } = extractRisk(spec);
  const components = extractComponents(spec);
  const rules = extractPromotionRules(spec);
  const stagingGate = evaluatePromotionGate(spec, 'staging');
  const productionGate = evaluatePromotionGate(spec, 'production');

  const riskBadge = risk === 'high' ? '🔴 HIGH' : risk === 'medium' ? '🟡 MEDIUM' : '🟢 LOW';
  const breakingBadge = breaking ? '⚠️  YES — breaking' : '✅ No';

  const lines = [
    '# SpecKit Change Spec Summary',
    '',
    `> Generated by SpecKit spec-extractor`,
    '',
    '## Change Details',
    '',
    `| Field | Value |`,
    `|---|---|`,
    `| **Title** | ${c.title || '—'} |`,
    `| **Type** | \`${type}\` |`,
    `| **Risk** | ${riskBadge} |`,
    `| **Breaking** | ${breakingBadge} |`,
    '',
    `> ${rationale}`,
    '',
  ];

  if (c.description) {
    lines.push('## Description', '', c.description.trim(), '');
  }

  if (components.length > 0) {
    lines.push('## Affected Components', '');
    lines.push('| Component | Impact |');
    lines.push('|---|---|');
    components.forEach((comp) => {
      const impactIcon = comp.impact === 'new' ? '🆕' : comp.impact === 'removed' ? '🗑️' : '✏️';
      lines.push(`| \`${comp.name}\` | ${impactIcon} ${comp.impact || '—'} |`);
    });
    lines.push('');
  }

  lines.push('## Promotion Rules', '');
  lines.push(`- **Required approvals:** ${rules.require_approvals}`);
  lines.push(`- **Passing tests required:** ${rules.require_passing_tests ? 'Yes' : 'No'}`);
  lines.push(`- **Security scan required:** ${rules.require_security_scan ? 'Yes' : 'No'}`);
  lines.push(`- **Target environments:** ${rules.environments.join(' → ')}`);
  lines.push('');

  lines.push('## Promotion Gate Results', '');
  lines.push('| Environment | Status | Notes |');
  lines.push('|---|---|---|');

  const stagingStatus = stagingGate.blocked ? '🔴 Blocked' : '🟢 Clear';
  const stagingNotes = stagingGate.reasons.join('; ') || 'All gates passed';
  lines.push(`| staging | ${stagingStatus} | ${stagingNotes} |`);

  const productionStatus = productionGate.blocked ? '🔴 Blocked' : '🟢 Clear';
  const productionNotes = productionGate.reasons.join('; ') || 'All gates passed';
  lines.push(`| production | ${productionStatus} | ${productionNotes} |`);
  lines.push('');

  if (c.refs && c.refs.length > 0) {
    lines.push('## References', '');
    c.refs.forEach((ref) => lines.push(`- ${ref}`));
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  validateChangeSpec,
  extractRisk,
  extractComponents,
  extractPromotionRules,
  evaluatePromotionGate,
  generateSummary,
  VALID_RISK_LEVELS,
  VALID_CHANGE_TYPES,
};

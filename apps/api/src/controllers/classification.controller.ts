import { Request, Response } from 'express';
import { eventClassifierService } from '../services/classification/event-classifier.service.js';
import { fileClassifierService } from '../services/classification/file-classifier.service.js';
import { emailClassifierService } from '../services/classification/email-classifier.service.js';
import { Policy } from '../models/policy.model.js';
import { ClassificationRecord } from '../models/classification-record.model.js';
import { sendSuccess, sendError, extractError } from '../utils/api-response.js';

export async function classifyEvent(req: Request, res: Response): Promise<void> {
  try {
    const { event, history, policyVersion } = req.body;
    if (!event) {
      sendError(res, 400, 'BAD_REQUEST', 'Missing "event" in request payload');
      return;
    }

    const domainId = req.domain?.id || req.domain?._id;

    const result = await eventClassifierService.classifyEvent({
      event,
      history,
      policyVersion,
      domainId,
    });

    sendSuccess(res, result);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'CLASSIFY_EVENT_FAILED', 'Event classification failed');
    sendError(res, statusCode, code, message);
  }
}

export async function classifyFile(req: Request, res: Response): Promise<void> {
  try {
    const { filename, contentBase64, mimeType, sha256, policyVersion } = req.body;
    if (!filename) {
      sendError(res, 400, 'BAD_REQUEST', 'Missing "filename" in request payload');
      return;
    }

    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const userId = req.user?.sub;
    const domainId = req.domain?.id || req.domain?._id;

    const result = await fileClassifierService.classifyFile({
      filename,
      contentBase64,
      mimeType,
      sha256,
      userId,
      domainId,
      ip,
      policyVersion,
    });

    sendSuccess(res, result);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'CLASSIFY_FILE_FAILED', 'File classification failed');
    sendError(res, statusCode, code, message);
  }
}

export async function classifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, policyVersion } = req.body;
    if (!email || !email.from || !email.subject) {
      sendError(res, 400, 'BAD_REQUEST', 'Missing valid "email" object with from and subject');
      return;
    }

    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const userId = req.user?.sub;
    const domainId = req.domain?.id || req.domain?._id;

    const result = await emailClassifierService.classifyEmail({
      email,
      ip,
      userId,
      domainId,
      policyVersion,
    });

    sendSuccess(res, result);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'CLASSIFY_EMAIL_FAILED', 'Email classification failed');
    sendError(res, statusCode, code, message);
  }
}

export async function listPolicies(req: Request, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.classifierType) {
      filter.classifierType = req.query.classifierType;
    }
    if (req.query.isCurrent !== undefined) {
      filter.isCurrent = req.query.isCurrent === 'true';
    }

    const policies = await Policy.find(filter).sort({ classifierType: 1, version: -1 });
    sendSuccess(res, policies);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'LIST_POLICIES_FAILED', 'Failed to list policies');
    sendError(res, statusCode, code, message);
  }
}

export async function getPolicyById(req: Request, res: Response): Promise<void> {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      sendError(res, 404, 'NOT_FOUND', 'Policy not found');
      return;
    }
    sendSuccess(res, policy);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'GET_POLICY_FAILED', 'Failed to retrieve policy');
    sendError(res, statusCode, code, message);
  }
}

export async function updatePolicy(req: Request, res: Response): Promise<void> {
  try {
    const existing = await Policy.findById(req.params.id);
    if (!existing) {
      sendError(res, 404, 'NOT_FOUND', 'Policy not found');
      return;
    }

    // Policy Immutability: create new version, demote existing
    existing.isCurrent = false;
    await existing.save();

    const newVersion = existing.version + 1;
    const newPolicy = await Policy.create({
      classifierType: existing.classifierType,
      version: newVersion,
      name: req.body.name || `${existing.name} (v${newVersion})`,
      description: req.body.description || existing.description,
      rules: req.body.rules || existing.rules,
      thresholds: req.body.thresholds || existing.thresholds,
      isCurrent: true,
    });

    sendSuccess(res, newPolicy, 201, `Policy updated; new version ${newVersion} created`);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'UPDATE_POLICY_FAILED', 'Failed to update policy');
    sendError(res, statusCode, code, message);
  }
}

export async function listClassificationHistory(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const isSecurityStaff = Boolean(
      req.user?.roles?.includes('admin') || req.user?.roles?.includes('analyst'),
    );

    const query: Record<string, unknown> = {};
    if (req.query.subjectType) query.subjectType = req.query.subjectType;
    if (req.query.verdict) query.verdict = req.query.verdict;

    if (req.domain) {
      query.domainId = req.domain.id || (req.domain as unknown as { _id?: string })._id?.toString();
    } else if (isSecurityStaff) {
      if (req.query.domainId) query.domainId = req.query.domainId;
      if (req.query.userId) query.userId = req.query.userId;
    } else if (req.user?.sub) {
      query.userId = req.user.sub;
      if (req.query.domainId) query.domainId = req.query.domainId;
    }

    const [records, total] = await Promise.all([
      ClassificationRecord.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      ClassificationRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'AUDIT_QUERY_FAILED', 'Failed to query classification history');
    sendError(res, statusCode, code, message);
  }
}

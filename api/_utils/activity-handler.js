import { ActivityRepository } from '../_src/repositories/ActivityRepository.js';
import { validateActivity, validatePreferences, validateActivityPage } from './activity-validation.js';

export async function handleActivityRequest(req,res,sql,userId) {
  const repository = new ActivityRepository(sql);
  try {
    if (req.query.action === 'preferences') {
      if (req.method === 'GET') return res.status(200).json(await repository.preferences(userId));
      if (req.method === 'POST') return res.status(200).json(await repository.setPreferences(userId,validatePreferences(req.body)));
    } else {
      if (req.method === 'GET') return res.status(200).json(await repository.list(userId,validateActivityPage(req.query)));
      if (req.method === 'POST') return res.status(200).json(await repository.save(userId,validateActivity(req.body)));
      if (req.method === 'DELETE') { await repository.clear(userId); return res.status(200).json({success:true}); }
    }
    return res.status(405).json({error:'Method not allowed'});
  } catch (error) {
    if(error.status === 400) return res.status(400).json({error:error.message});
    console.error('Activity request failed', {code:error.code || 'INTERNAL'});
    return res.status(503).json({error:'Saved activity is temporarily unavailable. Your draft has not been changed.'});
  }
}

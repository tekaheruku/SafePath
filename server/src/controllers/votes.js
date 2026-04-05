import { VoteService } from '../services/vote.js';
export class VoteController {
    /**
     * POST /api/v1/reports/:id/vote
     * Cast or update a vote
     */
    static async castVote(req, res) {
        try {
            const { id } = req.params;
            const { type } = req.body; // 'up' or 'down'
            const userId = req.user.id;
            if (!['up', 'down'].includes(type)) {
                res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_VOTE_TYPE', message: 'Vote type must be up or down' },
                    timestamp: new Date().toISOString()
                });
                return;
            }
            await VoteService.castVote(id, userId, type);
            const counts = await VoteService.getVoteCounts(id);
            res.json({
                success: true,
                data: {
                    report_id: id,
                    vote_type: type,
                    upvotes_count: counts.up,
                    downvotes_count: counts.down
                },
                timestamp: new Date().toISOString(),
                request_id: req.id
            });
        }
        catch (error) {
            console.error('Error casting vote:', error);
            res.status(500).json({
                success: false,
                error: { code: 'VOTE_ERROR', message: error.message },
                timestamp: new Date().toISOString(),
                request_id: req.id
            });
        }
    }
}

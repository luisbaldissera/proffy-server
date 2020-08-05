import { Request, Response } from 'express';
import db from '../database/connection';

export default class ConnectionController {
    async index(request: Request, response: Response) {
        const { total } = (await db('connections').count('* as total'))[0];
        return response.json({ total });
    }

    async create(request: Request, response: Response) {
        const { user_id } = request.body;
        try {
            await db('connections').insert({ user_id });
            return response.status(201).send();
        } catch (err) {
            return response.status(400).json({ err: 'Unexpected error while makin connection'});
        }
    }
}
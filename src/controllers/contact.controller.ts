import { Request, Response } from 'express';
import { identifyContact } from '../services/contact.service';
import { IdentifyRequest } from '../types/contact.types';

export const handleIdentify = async (req: Request, res: Response) => {
    const { email, phoneNumber }: IdentifyRequest = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({
            error: 'Either email or phoneNumber must be provided.'
        });
    }

    try {
        const result = await identifyContact(email, String(phoneNumber || '')); 
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error in handleIdentify:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
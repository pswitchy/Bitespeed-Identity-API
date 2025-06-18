import { query } from '../db';
import { IContact, IdentifyResponse } from '../types/contact.types';

export const identifyContact = async (email?: string, phoneNumber?: string): Promise<IdentifyResponse> => {
    
    const findQuery = `
        SELECT * FROM "Contact"
        WHERE (email = $1 AND $1 IS NOT NULL) OR ("phoneNumber" = $2 AND $2 IS NOT NULL)
        ORDER BY "createdAt" ASC;
    `;

    const validEmail = email;
    const validPhoneNumber = phoneNumber;

    const { rows: matchingContacts } = await query(findQuery, [validEmail, validPhoneNumber]);

    if (matchingContacts.length === 0) {
        const insertQuery = `
            INSERT INTO "Contact" (email, "phoneNumber", "linkPrecedence")
            VALUES ($1, $2, 'primary')
            RETURNING *;
        `;
        const { rows: [newContact] } = await query(insertQuery, [validEmail, validPhoneNumber]);
        return formatResponse([newContact]);
    }

    const primaryContactIds = new Set<number>();
    matchingContacts.forEach(contact => {
        primaryContactIds.add(contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!);
    });

    const primaryId = Math.min(...Array.from(primaryContactIds));
    
    if (primaryContactIds.size > 1) {
        const newerPrimaryId = Math.max(...Array.from(primaryContactIds));
        
        const updateQuery = `
            UPDATE "Contact"
            SET "linkedId" = $1, "linkPrecedence" = 'secondary', "updatedAt" = NOW()
            WHERE id = $2;
        `;
        await query(updateQuery, [primaryId, newerPrimaryId]);
    }
    
    
    const allRelatedContactsQuery = `
        SELECT * FROM "Contact"
        WHERE "linkedId" = $1 OR id = $1
        ORDER BY "createdAt" ASC;
    `;
    const { rows: allCurrentContacts } = await query(allRelatedContactsQuery, [primaryId]);

    const hasEmail = allCurrentContacts.some(c => c.email === validEmail);
    const hasPhoneNumber = allCurrentContacts.some(c => c.phoneNumber === validPhoneNumber);


    if ((validEmail && !hasEmail) || (validPhoneNumber && !hasPhoneNumber)) {
        const insertQuery = `
            INSERT INTO "Contact" (email, "phoneNumber", "linkedId", "linkPrecedence")
            VALUES ($1, $2, $3, 'secondary')
            RETURNING *;
        `;
        await query(insertQuery, [validEmail, validPhoneNumber, primaryId]);
    }

    const { rows: allFinalContacts } = await query(allRelatedContactsQuery, [primaryId]);
    
    const mergedChildrenQuery = `
        SELECT * FROM "Contact"
        WHERE "linkedId" IN (SELECT id FROM "Contact" WHERE "linkedId" = $1);
    `
    const { rows: mergedChildren } = await query(mergedChildrenQuery, [primaryId]);


    return formatResponse([...allFinalContacts, ...mergedChildren]);
};

const formatResponse = (contacts: IContact[]): IdentifyResponse => {
    if (contacts.length === 0) {
        throw new Error("Cannot format response for empty contacts array.");
    }

    const primaryContact = contacts.find(c => c.linkPrecedence === 'primary') || contacts[0];
    
    const emails = [...new Set(contacts.map(c => c.email).filter(Boolean))] as string[];
    const phoneNumbers = [...new Set(contacts.map(c => c.phoneNumber).filter(Boolean))] as string[];
    
    const secondaryContactIds = contacts
        .filter(c => c.id !== primaryContact.id)
        .map(c => c.id);

    return {
        contact: {
            primaryContactId: primaryContact.id,
            emails,
            phoneNumbers,
            secondaryContactIds,
        }
    };
};
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const result = await prisma.$queryRaw`
EXPLAIN QUERY PLAN
SELECT user.id, user.username, user.name, image.id as imageId
FROM User AS user
LEFT JOIN UserImage AS image ON user.id = image.userId
WHERE user.username LIKE '%kody%'
OR user.name LIKE '%kody%'
ORDER BY (
   SELECT updatedAt
   FROM Note
   WHERE ownerId = user.id
   ORDER BY updatedAt DESC
   LIMIT 1
) DESC
LIMIT 50;
`
console.log(result)

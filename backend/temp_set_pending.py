from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from bson import ObjectId

async def main():
    mongo_url = "mongodb://localhost:27017" # Default for local
    db_name = "autogestao"
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get the admin workspace
    admin_user = await db.users.find_one({"email": "admin@autogestao.com"})
    if admin_user:
        workspace_id = admin_user.get("workspace_id")
        if workspace_id:
            await db.workspaces.update_one(
                {"_id": ObjectId(workspace_id)},
                {"$set": {"status": "pending"}}
            )
            print(f"Workspace {workspace_id} status set to pending")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

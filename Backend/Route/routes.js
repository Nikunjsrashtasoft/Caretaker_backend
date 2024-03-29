import express from "express";
import { getRepository } from "typeorm";
import { User } from "../entity/User.js";
import { Shift } from "../entity/Shift.js";
const router = express.Router();
// Create User
router.post("/users", async (req, res) => {
  console.log("got request for that end piont /users");
  const userRepository = getRepository(User);
  console.log("");
  const user = userRepository.create(req.body); // Create a new user instance
  await userRepository.save(user); // Save it to the database
  return res.json(user);
});

// Read Users
router.get("/users", async (req, res) => {
  const userRepository = getRepository(User);
  const users = await userRepository.find(); // Find all users
  return res.json(users);
});

// Update User
router.put("/users/:id", async (req, res) => {
  console.log("Update User req", req.params.id);
  const userRepository = getRepository(User);
  try {
    let user = await userRepository.findOneBy({ id: parseInt(req.params.id) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    userRepository.merge(user, req.body);
    const results = await userRepository.save(user);
    return res.json(results);
  } catch (error) {
    // Log the error and return a 500 status code for an internal server error
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Error updating user" });
  }
});

// Delete User
router.delete("/users/:id", async (req, res) => {
  const userRepository = getRepository(User);
  const id = parseInt(req.params.id); // Ensure the ID is a number

  try {
    // First, check if the user exists
    const user = await userRepository.findOneBy({ id: id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user exists, proceed with deletion
    const results = await userRepository.delete(id);

    // Optionally, check the result to see if the delete operation was successful
    if (results.affected === 0) {
      // No rows affected, which means the deletion didn't happen as expected
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Error deleting user" });
  }
});


const findDuplicateShift = async (shiftRepository, { caretakerId, day_data, startTime, endTime }) => {
    const existingShift = await shiftRepository.findOne({
      where: {
        caretakerId:caretakerId,
        day: day_data,
        startTime,
        endTime,
      },
    });
    console.log('caretakerId, day_data, startTime, endTime',caretakerId, day_data, startTime, endTime)
    console.log("existingShift.....",existingShift)
    return existingShift !== null;
  };



router.post("/shifts", async (req, res) => {
    let caretakerNotFound = "Caretaker not found."
    let duplicateShift = "Selected time shift already exists, can't be duplicate."
    let genericError = "An error occurred while processing your request."
    let invalidShiftDuration = "Shift duration must be more than 15 minutes."
    let endTimeBeforeStartTime = "End time should be later than the start time."

    const { caretakerId = '', day = [], startTime = '', endTime = '' } = req.body.shift || {};

    // Check for required fields
    if (!caretakerId || !day.length || !startTime || !endTime) {
        let missingFields = [];
        if (!caretakerId) missingFields.push('caretakerId');
        if (!day.length) missingFields.push('day');
        if (!startTime) missingFields.push('startTime');
        if (!endTime) missingFields.push('endTime');

        const missing = missingFields.join(', ');
        return res.status(400).json({ message: `Missing required fields: ${missing}.` });
    }

    // Validate start time and end time
    const start = new Date(`1970/01/01 ${startTime}`);
    const end = new Date(`1970/01/01 ${endTime}`);
    const duration = (end - start) / (1000 * 60); // Convert milliseconds to minutes

    if (duration <= 15) {
        return res.status(400).json({ message: invalidShiftDuration });
    }

    if (start >= end) {
        return res.status(400).json({ message: endTimeBeforeStartTime });
    }
  
    const shiftRepository = getRepository(Shift);
    const userRepository = getRepository(User);
  
    try {
      const caretaker = await userRepository.findOneBy({ id: caretakerId });
      if (!caretaker) {
        return res.status(404).json({ message: caretakerNotFound });
      }
  
      let shifts = [];
      let duplicateEntries = 0;
      for (const day_data of day) {
        const isDuplicate = await findDuplicateShift(shiftRepository, { caretakerId, day_data, startTime, endTime });
        console.log("isDuplicate....",isDuplicate)
        if (!isDuplicate) {
          const shift = shiftRepository.create({
            caretaker: caretaker,
            day: day_data,
            startTime: startTime,
            endTime: endTime,
          });
          const savedShift = await shiftRepository.save(shift);
          shifts.push(savedShift);
        } else {
          duplicateEntries++;
          console.log(`Skipping duplicate shift for day: ${day_data}`);
        }
      }
  
      if (shifts.length > 0) {
        return res.json({success: true, createdShifts: shifts, message: duplicateEntries > 0 ? duplicateShift : "Shifts created successfully."});
      } else {
        return res.status(400).json({ message: duplicateShift });
      }
    } catch (error) {
      console.error("Error adding shift:", error);
      return res.status(500).json({ message: genericError });
    }
  });


router.put("/shifts/:shiftId", async (req, res) => {
    const shiftId = req.params.shiftId;
    const { day, startTime, endTime } = req.body;
    
    const shiftRepository = getRepository(Shift);

    try {
        const shift = await shiftRepository.findOneBy({ id: shiftId });
        if (!shift) {
            return res.status(404).json({ message: "Shift not found" });
        }

        // Update the shift
        shift.day = day || shift.day;
        shift.startTime = startTime || shift.startTime;
        shift.endTime = endTime || shift.endTime;

        await shiftRepository.save(shift);

        return res.json(shift);
    } catch (error) {
        console.error("Error updating shift:", error);
        return res.status(500).json({ message: "Error updating shift" });
    }
});


router.delete("/shifts/:shiftId", async (req, res) => {
    // Validation: Check if shiftId is provided and valid (e.g., a positive integer)
    const shiftId = req.params.shiftId;
    if (!shiftId || isNaN(shiftId) || parseInt(shiftId) <= 0) {
        return res.status(400).json({ message: "Invalid shift ID provided." });
    }

    const shiftRepository = getRepository(Shift);

    try {
        // Attempt to first find the shift to provide a more specific error if not found.
        const shift = await shiftRepository.findOneBy({ id: shiftId });
        if (!shift) {
            return res.status(404).json({ message: "Shift not found. Unable to delete a non-existing shift." });
        }

        // Proceed with deletion if the shift exists
        const result = await shiftRepository.delete(shiftId);
        if (result.affected === 0) {
            // This condition might be redundant given the prior check, but serves as a double-check.
            return res.status(404).json({ message: "Shift not found despite initial check. Deletion failed." });
        }

        // Successful deletion
        return res.status(204).json({ message: "Shift Delete Sucessfully." }); // No content to return
    } catch (error) {
        // Log the specific error and return a generic error message
        console.error("Error deleting shift:", error);

        // Distinguish between potential database/connection errors for more specific feedback
        if (error.name === "QueryFailedError") {
            return res.status(500).json({ message: "Database query failed during shift deletion." });
        }

        // Generic error fallback
        return res.status(500).json({ message: "An unexpected error occurred during shift deletion." });
    }
});




router.get("/shifts", async (req, res) => {
    const caretakerRepository = getRepository(User); // Assuming you have a Caretaker entity
    const shiftRepository = getRepository(Shift);

    try {
        // Fetch all caretakers
        const caretakers = await caretakerRepository.find();

        // Fetch all shifts including their caretaker relations
        const shifts = await shiftRepository.find({
            relations: ["caretaker"]
        });

        // Transform shifts to group them by caretaker
        let groupedByCaretaker = shifts.reduce((acc, shift) => {
            const caretakerId = shift.caretaker.id;
            if (!acc[caretakerId]) {
                acc[caretakerId] = {
                    caretaker: shift.caretaker,
                    shifts: []
                };
            }
            acc[caretakerId].shifts.push({
                id: shift.id,
                day: shift.day,
                startTime: shift.startTime,
                endTime: shift.endTime
            });
            return acc;
        }, {});

        // Ensure all caretakers are included, even those without shifts
        caretakers.forEach(caretaker => {
            if (!groupedByCaretaker[caretaker.id]) {
                groupedByCaretaker[caretaker.id] = {
                    caretaker: caretaker,
                    shifts: [] // No shifts for this caretaker
                };
            }
        });

        // Convert the grouped object to an array
        const result = Object.values(groupedByCaretaker);

        return res.json(result);
    } catch (error) {
        console.error("Error retrieving shifts:", error);
        return res.status(500).json({ message: "Error retrieving shifts" });
    }
});


export default router;

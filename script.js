// ----------------------------------------
// ABC Tutoring appointment information
// ----------------------------------------

const tutorSchedules = {
    "sarah-johnson": [
        "Monday at 4:00 PM",
        "Monday at 5:00 PM",
        "Wednesday at 4:00 PM"
    ],

    "michael-chen": [
        "Tuesday at 4:00 PM",
        "Tuesday at 5:00 PM",
        "Thursday at 5:00 PM"
    ],

    "emily-rodriguez": [
        "Monday at 4:00 PM",
        "Wednesday at 5:00 PM",
        "Friday at 4:00 PM"
    ],

    "david-williams": [
        "Tuesday at 5:00 PM",
        "Thursday at 4:00 PM",
        "Friday at 5:00 PM"
    ],

    "aisha-patel": [
        "Monday at 5:00 PM",
        "Wednesday at 4:00 PM",
        "Thursday at 5:00 PM"
    ],

    "james-thompson": [
        "Tuesday at 4:00 PM",
        "Wednesday at 5:00 PM",
        "Friday at 4:00 PM"
    ]
};


// ----------------------------------------
// PostHog helper
// ----------------------------------------

function trackEvent(eventName, eventProperties = {}) {
    if (window.posthog) {
        posthog.capture(eventName, eventProperties);
    }
}


// ----------------------------------------
// Track tutor booking-button clicks
// ----------------------------------------

const tutorBookingButtons = document.querySelectorAll(
    ".tutor-card .primary-button"
);

tutorBookingButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const destination = new URL(button.href);
        const tutorID = destination.searchParams.get("tutor");

        trackEvent("booking started", {
            tutor_id: tutorID
        });
    });
});


// ----------------------------------------
// Work with saved bookings
// ----------------------------------------

function getBookings() {
    const savedBookings = localStorage.getItem(
        "abcTutoringBookings"
    );

    if (!savedBookings) {
        return [];
    }

    try {
        return JSON.parse(savedBookings);
    } catch (error) {
        console.error("Saved bookings could not be read.", error);
        return [];
    }
}


function saveBookings(bookings) {
    localStorage.setItem(
        "abcTutoringBookings",
        JSON.stringify(bookings)
    );
}


// ----------------------------------------
// Find elements on the booking page
// ----------------------------------------

const bookingForm = document.querySelector("#booking-form");
const tutorSelect = document.querySelector("#tutor");
const timeSelect = document.querySelector("#appointment-time");
const confirmation = document.querySelector(
    "#booking-confirmation"
);


// ----------------------------------------
// Display available appointment times
// ----------------------------------------

function displayAvailableTimes() {
    if (!tutorSelect || !timeSelect) {
        return;
    }

    const selectedTutor = tutorSelect.value;
    const bookings = getBookings();

    // Remove the old appointment options
    timeSelect.innerHTML =
        '<option value="">Select an available time</option>';

    timeSelect.disabled = false;

    if (!selectedTutor) {
        return;
    }

    const tutorTimes = tutorSchedules[selectedTutor] || [];

    // Get appointments already booked for this tutor
    const bookedTimes = bookings
        .filter(function (booking) {
            return booking.tutor === selectedTutor;
        })
        .map(function (booking) {
            return booking.appointmentTime;
        });

    // Remove already-booked appointments
    const availableTimes = tutorTimes.filter(function (time) {
        return !bookedTimes.includes(time);
    });

    if (availableTimes.length === 0) {
        const unavailableOption =
            document.createElement("option");

        unavailableOption.value = "";
        unavailableOption.textContent =
            "No appointments currently available";

        timeSelect.appendChild(unavailableOption);
        timeSelect.disabled = true;

        return;
    }

    // Add available appointments to the dropdown
    availableTimes.forEach(function (time) {
        const option = document.createElement("option");

        option.value = time;
        option.textContent = time;

        timeSelect.appendChild(option);
    });
}


// ----------------------------------------
// Select the tutor from the URL
// ----------------------------------------

function selectTutorFromURL() {
    if (!tutorSelect) {
        return;
    }

    const pageParameters = new URLSearchParams(
        window.location.search
    );

    const tutorFromURL = pageParameters.get("tutor");

    if (tutorFromURL && tutorSchedules[tutorFromURL]) {
        tutorSelect.value = tutorFromURL;
    }

    displayAvailableTimes();
}


// ----------------------------------------
// Booking-form functionality
// ----------------------------------------

if (bookingForm && tutorSelect && timeSelect && confirmation) {
    // Automatically select the tutor whose button was clicked
    selectTutorFromURL();

    // Update appointment times when another tutor is selected
    tutorSelect.addEventListener("change", function () {
        displayAvailableTimes();

        if (tutorSelect.value) {
            trackEvent("tutor selected", {
                tutor_id: tutorSelect.value
            });
        }
    });

    // Process the booking
    bookingForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const parentName = document
            .querySelector("#parent-name")
            .value
            .trim();

        const phoneNumber = document
            .querySelector("#phone-number")
            .value
            .trim();

        const studentName = document
            .querySelector("#student-name")
            .value
            .trim();

        const studentGrade = document
            .querySelector("#student-grade")
            .value;

        const selectedTutor = tutorSelect.value;
        const selectedTime = timeSelect.value;

        // Make sure every field is completed
        if (
            !selectedTutor ||
            !selectedTime ||
            !parentName ||
            !phoneNumber ||
            !studentName ||
            !studentGrade
        ) {
            alert("Please complete every field.");
            return;
        }

        const bookings = getBookings();

        // Check whether someone already booked this appointment
        const appointmentTaken = bookings.some(
            function (booking) {
                return (
                    booking.tutor === selectedTutor &&
                    booking.appointmentTime === selectedTime
                );
            }
        );

        if (appointmentTaken) {
            alert(
                "That appointment is no longer available. " +
                "Please select another time."
            );

            displayAvailableTimes();
            return;
        }

        // Create the booking
        const newBooking = {
            id: Date.now(),
            tutor: selectedTutor,
            appointmentTime: selectedTime,
            parentName: parentName,
            phoneNumber: phoneNumber,
            studentName: studentName,
            studentGrade: studentGrade
        };

        // Save the booking
        bookings.push(newBooking);
        saveBookings(bookings);

        // Send only non-private information to PostHog
        trackEvent("booking completed", {
            tutor_id: selectedTutor,
            appointment_time: selectedTime
        });

        // Hide the form
        bookingForm.hidden = true;

        // Display the confirmation
        confirmation.hidden = false;

        confirmation.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
}
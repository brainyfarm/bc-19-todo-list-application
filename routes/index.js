let express = require('express');
let router = express.Router();

const firebase = require('firebase');

// Setup and Initialize Firebase
let config = {
    apiKey: process.env.FIREBASE_APIKEY,
    authDomain: process.env.FIREBASE_AUTHDOMAIN,
    databaseURL: process.env.FIREBASE_DATABASEURL,
    storageBucket: process.env.FIREBASE_STORAGEBUCKET,
};

firebase.initializeApp(config);
const db = firebase.database();


/**
 * generateProjectUrl
 * Returns a project's own unique url
 * @param projectID
 * @return url(path) to project dashboard
 */
function generateProjectUrl(projectID) {
    return `/project/${projectID}`;
}


function generateTaskUrl(projectID, taskID) {
    return `${generateProjectUrl(projectID)}/${taskID}`;
}


function generateSubTaskUrl(taskUrl, subtaskID) {
    return `${taskUrl}/${subtaskID}`;
}

/**
 * getProjectData
 * Get the data for a PROJECT from the database
 * @param projectID 
 * @return projectData.val()
 */
function getProjectData(projectID) {
    return db.ref(`/projects/${projectID}`).once("value")
        .then(function (projectData) {
            return projectData.val();
        });
}

/**
 * getTaskData
 * Get the data for a TASK from the database
 * @param taskID 
 * @return taskData.val()
 */
function getTaskData(taskID) {
    return db.ref(`/tasks/${taskID}`).once("value")
        .then(function (taskData) {
            return taskData.val();
        });
}

/**
 * getSubTaskData
 * Get the data for a SUBTASK from the database
 * @param subTaskID 
 * @return subTaskData.val()
 */
function getSubTaskData(subTaskID) {
    return db.ref(`/subtasks/${subTaskID}`).once("value")
        .then(function (subTaskData) {
            return subTaskData.val();
        });
}

/**
 * saveProject
 * Saves a newly created project into the database 
 * Also saves the project id into the user table as a reference to the user
 * @param name, description
 * @return the saved project key
 */
function saveProject(name, description) {
    let userRef = db.ref(`/users/${global.currentUserID}/projects`);
    let projectRef = db.ref("/projects").push({
        name: name,
        description: description,
        start_time: new Date().toISOString(),
        active: true,
        sprint_level: 1
    });

    userRef.update({
        [projectRef.key]: true // Save the project ID reference under the user Object
    });

    return projectRef.key;
}

/**
 * saveTask 
 * Saves a created task into the database 
 * @param projectID, title, description
 */
function saveTask(projectID, title, description) {
    let projectRef = db.ref(`/projects/${projectID}/tasks`);
    let taskRef = db.ref('/tasks').push({
        title: title,
        description: description,
        completed: false,
        created: new Date().toISOString()
    });
   
   // Save the task to the parent project to reference which project owns a task
    return getProjectData(projectID)
        .then(function (projectData) {
            projectRef.update({
                [taskRef.key]: projectData.sprint_level || 1 // Save the task with the current sprint the project is in
            });
        });
}

/**
 * saveSubTask 
 * Saves a created subtask into the database 
 * @param taskID, title, description
 */
function saveSubTask(taskID, title, description) {
    let taskRef = db.ref(`/tasks/${taskID}/subtasks`);
    let subtaskRef = db.ref('/subtasks').push({
        title: title,
        description: description
    });

    // Also binds the subtask ID to the parent task
    return getTaskData(taskID)
        .then(function (taskData) {
            taskRef.update({
                [subtaskRef.key]: false // Subtasks is not completed by default
            })
        });
}


/**
 * Configuration for /logout route 
 * I delete the user session
 * Redirects them to the login page
 */
router.get('/logout', function (req, res, next) {
    global.currentUser = null;
    res.redirect('/login');
});

/**
 * Configuration for the / route
 * We render a welcome page to the user
 */
router.get('/', function (req, res, next) {
    // If user is already logged in
    // redirect him to projects page
    if (global.currentUser)
        res.redirect("/projects");
    else
        res.render('index', { title: 'TODO Application: Welcome' });
});

/** 
 * Configuration of the login route
 * Renders the login page to the user
*/
router.get('/login', function (req, res, next) {
    // If user is already logged in
    //  redirect him to projects page
    if (global.currentUser)
        res.redirect("/projects");
    else
        res.render('login', { title: 'TODO Application: Login' });
});

/**
 * Configuring the registration route 
 * renders the register file to user
 */
router.get('/register', function (req, res, next) {
    res.render('register', { title: 'TODO Application: Sign up' });
});


/**
 * Configuration for the /projects route
 * Fetches a list of the user's own project from the database
 */
router.get('/projects', function (req, res, next) {
    // Check to see if a user is actually logged in
    if (global.currentUser) {
        let projectsRef = db.ref(`/users/${global.currentUserID}/projects`);
        
        // Get the user's projects, returns an object of the projects ID's  or an empty array if none exists
        projectsRef.once("value")
            .then(function (snapshot) {
                if (!snapshot.val()) {
                    return [];
                }
                
                // Saves the projectIDs as an array 
                let projectKeys = Object.keys(snapshot.val());

                // Maps through the projectKeys to generate the projects data, return an array of the projectKey and data
                let dataPromises = projectKeys.map(function (projectKey) {
                    return getProjectData(projectKey)
                        .then(function(data) {
                            return [generateProjectUrl(projectKey), data];
                        });
                });

                // Return everything when all projects' data is fetched
                return Promise.all(dataPromises);
            })
            .then(function (data) {
                // Render the projects page and send all projects' data to the page to be populated
                res.render('projects', { title: 'TODO: Projects', email: global.currentUser, projectList: data });
            })
    }
    // If it turns out no user is  logged in
    else
        res.redirect('/login');
});

// Configuration for the reports page
router.get('/report', function (req, res, next) {
    if (global.currentUser)
        res.render('report', { title: 'Project Report', email: global.currentUser });
    else
        res.redirect('/login');
});

// Handling user registration
router.post('/register', function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    firebase.auth()
        .createUserWithEmailAndPassword(email, password)
        .then(function (userObject) {
            global.currentUser = email;
            let userID = userObject.uid;
            global.currentUserID = userID;

            let db = firebase.database();
            let ref = db.ref("/");
            let usersRef = ref.child("users");
            usersRef.set({
                [userID]: {
                    joined: new Date().toISOString()
                }
            });

            res.redirect('/projects');
        })
        .catch(function (error) {
            let errorCode = error.code;
            let errorMessage = error.message;
            if (errorMessage) {
                return res.send(errorMessage);
            }
        });
});

// Handling user login
router.post('/login', function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    firebase.auth()
        .signInWithEmailAndPassword(email, password)
        .then(function (data) {
            global.currentUserID = data.uid;
            global.currentUser = email;

            res.redirect('/projects');
        }, function (error) {
            return res.send(error && error.message);
        });
});

// Handling user's submission of projects
router.post('/projects', function (req, res) {
    // If user is trying to add a project without and not logged in 
    if (!global.currentUser)
        return res.send("Please login first!")

    const projectTitle = req.body.title;
    const projectDescription = req.body.description;

    // If user supplies falsy values
    if (!(Boolean(projectTitle) && Boolean(projectDescription))) {
        return res.send("Provide a valid project title and description!");
    }

    let projectKey = saveProject(projectTitle, projectDescription)
   
   // Redirect to the particular project dashboard
    return res.redirect(generateProjectUrl(projectKey));
});

/**
 * Configuration of each project dashboard path
 */
router.get('/project/:projectID', function (req, res) {
    // get the project id from the url scheme
    let projectID = req.params.projectID;

    // Fetch the project data
    getProjectData(projectID)
        .then(function (projectData) {
            let sprintLevel = projectData.sprint_level || 1;
            let sprintTasks = projectData.tasks || [];

            // We need an array of task keys
            let taskPromises = Object.keys(sprintTasks) 
                .filter(function (taskKey) {
                    return sprintTasks[taskKey] === sprintLevel; // Pick only keys for tasks in the current sprint
                })
                .map(function (taskID) {
                    // Return an array of the Tasks Promise Values
                    return getTaskData(taskID)
                        .then(function (data) {
                            return [generateTaskUrl(projectID, taskID), data];
                        })
                })

            return Promise.all([sprintLevel, projectData, ...taskPromises]); // We return the sprint level and array of tasks
        })
        .then(function (data) {
            let [sprintLevel, projectData, ...tasks] = data; // Destructure the array as we constructed.

            let taskMutationPromises = tasks.map(function ([url, task]) {
                // Populate Subtask for each task
                let subtasks = task.subtasks || [];
                
                let subtaskPromises = Object.keys(subtasks)
                    .map(function (subtaskID) {
                        return getSubTaskData(subtaskID)
                            .then(function (data) {
                                data.completed = task.subtasks[subtaskID]; // Get the value of the subtask for whether the project is completed or not.

                                return [generateSubTaskUrl(url, subtaskID), data];
                            })
                    })

                // Mutation: Replace subtasks keys with the actual data
                return Promise.all(subtaskPromises)
                    .then(function (subtask) {
                        task.subtasks = subtask;
                        return [url, task];
                    })
            })

            return Promise.all([sprintLevel, projectData, ...taskMutationPromises]);
        })
        .then(function (data) {
            let [sprintLevel, projectData, ...tasks] = data; // Destructure the array as we constructed.

            let url = req.url;
            res.render('project-details', { title: 'TODO: Projects', projectData, url, sprintLevel, tasks });
        })
    // .catch(function (error) {
    //     res.send(error.message);
    // })
});

/**
 * Configuring project deletion
 */
router.get('/project/:projectID/delete', function (req, res) {
    db.ref(`/users/${global.currentUserID}/projects/${req.params.projectID}`)
        .remove()
        .then(function () {
            res.redirect("/projects");
        })
        .catch(function () {
            res.send("Project could not be deleted.");
        })
});

/**
 * Adding a new task
 */
router.post('/project/:projectID/task', function (req, res) {
    let projectID = req.params.projectID;
    //Todo: Checks.
    let taskTitle = req.body.title;
    let taskDescription = req.body.description.trim();
if (!(Boolean(taskTitle) && Boolean(taskDescription))) {
        return res.send("Provide valid title and description!");
    }
    saveTask(projectID, taskTitle, taskDescription)
        .then(function () {
            return res.redirect(generateProjectUrl(projectID));
        })
});

router.get('/project/:projectID/next', function (req, res) {
    // Next Sprint

    let projectID = req.params.projectID;

    // Todo: Mark all tasks in this sprint as complete.
    getProjectData(projectID)
        .then(function (projectData) {
            let sprintLevel = projectData.sprint_level || 1;

            if (sprintLevel === 4) {
                return res.redirect(`/project/${projectID}/report`);
            } else {
                db.ref(`/projects/${projectID}`).update({
                    sprint_level: sprintLevel + 1
                });

                res.redirect(generateProjectUrl(projectID));
            }
        })
})

/**
 * Completing a task
 */
router.get('/project/:projectID/:taskID/done', function (req, res) {
    let projectID = req.params.projectID;
    let taskID = req.params.taskID;

    db.ref(`/tasks/${taskID}`).update({
        completed: true,
        completion_date: new Date().toISOString()
    });

    res.redirect(generateProjectUrl(projectID));
});

/**
 * Adding a subtask
 */
router.post('/project/:projectID/:taskID/subtask', function (req, res) {
   
    let projectID = req.params.projectID;
    let taskID = req.params.taskID;

    let title = req.body.title;
    let description = req.body.description.trim();

 if (!(Boolean(title) && Boolean(description))) {
        return res.send("Provide valid title and description!");
    }

    saveSubTask(taskID, title, description)
        .then(function () {
            return res.redirect(generateProjectUrl(projectID));
        })
});

/** Completing a subtask */
router.post('/project/:projectID/:taskID/:subtaskID/done', function(req, res) {
    let projectID = req.params.projectID;
    let taskID = req.params.taskID;
    let subtask = req.params.subtaskID;
    db.ref(`/tasks/${taskID}/subtasks`).update({
        [subtask]: true
    });

    res.redirect(generateProjectUrl(projectID));
});

module.exports = router;
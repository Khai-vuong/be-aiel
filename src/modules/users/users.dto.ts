type LoginDto = {
    username: string;
    hashed_password: string;
};

type RegisterDto = {
    //User fields
    username: string;
    email: string;
    hashed_password: string;
    role : "Student" | "Lecturer" | "Admin";

    //For user types
    name: string;
    personal_info_json: string;
    major? : string;
}

type UpdateDto = {
    //User fields
    hashed_password?: string;
    status? : "Active" | "Logged_out" | "Expelled" | "Graduated";
    
    //General fields
    personal_info_json?: string;

    //User type specific fields
    major? : string;
}

type AuthorizeDto = {
    currentRole: "Admin" | "Lecturer" | "Student";
    newRole: "Admin" | "Lecturer" | "Student";
}


export {
    type LoginDto,
    type RegisterDto,
    type UpdateDto,
    type AuthorizeDto
}
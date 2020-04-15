const isEmail = (email) => {
  const regEx = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (email.match(regEx)) {
    return true;
  } else return false;
};

const isPassword = (password) => {
  const regEx = /^[\w@-]{6,20}$/;
  if (password.match(regEx)) {
    return true;
  } else return false;
};

const isUsername = (username) => {
  const regEx = /^[a-z\d]{5,16}$/;
  if (username.match(regEx)) {
    return true;
  } else return false;
};

const isEmpty = (string) => {
  if (string.trim() === "") {
    return true;
  } else return false;
};

exports.validateSignupData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }
  if (isEmpty(data.password)) {
    errors.password = "Must not be empty";
  } else if (!isPassword(data.password)) {
    error.password = "Must be alphanumeric (6–20 characters)"
  }
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  if (isEmpty(data.handle)) {
    errors.handle = "Must not be empty";
  } else if(!isUsername(data.handle)) {
    errors.handle = "Must be alphanumeric (5–16 characters)"
  }
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Must not be empty";
  if (isEmpty(data.password)) errors.password = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.reduceUserDetails = (data) => {
  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }
  if (!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
};

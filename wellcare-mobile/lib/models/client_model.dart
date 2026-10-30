class ClientModel {
  final int id;
  final String clientIdNumber;
  final String firstName;
  final String middleName;
  final String lastName;
  final String username;
  final String birthdate;
  final String phone;
  final String email;
  final String address;
  final String emergencyContact;
  final String emergencyNumber;
  final bool fingerprintEnrolled;
  final int alkalineSessions;
  final int checkins;
  final int absences;
  final String lastSeen;
  final String token;
  final String profilePhoto;

  ClientModel({
    required this.id,
    this.clientIdNumber = '',
    required this.firstName,
    this.middleName = '',
    required this.lastName,
    required this.username,
    this.birthdate = '',
    this.phone = '',
    this.email = '',
    this.address = '',
    this.emergencyContact = '',
    this.emergencyNumber = '',
    this.fingerprintEnrolled = false,
    this.alkalineSessions = 0,
    this.checkins = 0,
    this.absences = 0,
    this.lastSeen = '',
    this.token = '',
    this.profilePhoto = '',
  });

  String get fullName => '$firstName${middleName.isNotEmpty ? ' $middleName' : ''} $lastName'.trim();

  static bool _parseBool(dynamic v) {
    if (v == null) return false;
    if (v is bool) return v;
    if (v is int || v is num) return v == 1;
    if (v is String) return v == '1' || v.toLowerCase() == 'true';
    return false;
  }

  static int _parseInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  factory ClientModel.fromJson(Map<String, dynamic> json) {
    return ClientModel(
      id: _parseInt(json['id']),
      clientIdNumber: (json['clientIdNumber'] ?? json['client_id_number'] ?? '').toString(),
      firstName: (json['firstName'] ?? json['first_name'] ?? '').toString(),
      middleName: (json['middleName'] ?? json['middle_name'] ?? '').toString(),
      lastName: (json['lastName'] ?? json['last_name'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      birthdate: (json['birthdate'] ?? '').toString(),
      phone: (json['phone'] ?? json['contact_number'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      emergencyContact: (json['emergencyContact'] ?? json['emergency_contact'] ?? '').toString(),
      emergencyNumber: (json['emergencyNumber'] ?? json['emergency_number'] ?? '').toString(),
      fingerprintEnrolled: _parseBool(json['fingerprintEnrolled'] ?? json['fingerprint_enrolled']),
      alkalineSessions: _parseInt(json['alkalineSessions'] ?? json['alkaline_sessions'] ?? json['total_bottles']),
      checkins: _parseInt(json['checkins'] ?? json['total_checkins']),
      absences: _parseInt(json['absences']),
      lastSeen: (json['lastSeen'] ?? json['last_seen'] ?? '').toString(),
      token: (json['token'] ?? '').toString(),
      profilePhoto: (json['profilePhoto'] ?? json['profile_photo'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'clientIdNumber': clientIdNumber,
    'firstName': firstName,
    'middleName': middleName,
    'lastName': lastName,
    'username': username,
    'birthdate': birthdate,
    'phone': phone,
    'email': email,
    'address': address,
    'emergencyContact': emergencyContact,
    'emergencyNumber': emergencyNumber,
    'fingerprintEnrolled': fingerprintEnrolled,
    'alkalineSessions': alkalineSessions,
    'checkins': checkins,
    'absences': absences,
    'lastSeen': lastSeen,
    'token': token,
    'profilePhoto': profilePhoto,
    'profile_photo': profilePhoto,
  };

  ClientModel copyWith({
    int? id,
    String? clientIdNumber,
    String? firstName,
    String? middleName,
    String? lastName,
    String? username,
    String? birthdate,
    String? phone,
    String? email,
    String? address,
    String? emergencyContact,
    String? emergencyNumber,
    bool? fingerprintEnrolled,
    int? alkalineSessions,
    int? checkins,
    int? absences,
    String? lastSeen,
    String? token,
    String? profilePhoto,
  }) {
    return ClientModel(
      id: id ?? this.id,
      clientIdNumber: clientIdNumber ?? this.clientIdNumber,
      firstName: firstName ?? this.firstName,
      middleName: middleName ?? this.middleName,
      lastName: lastName ?? this.lastName,
      username: username ?? this.username,
      birthdate: birthdate ?? this.birthdate,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      emergencyNumber: emergencyNumber ?? this.emergencyNumber,
      fingerprintEnrolled: fingerprintEnrolled ?? this.fingerprintEnrolled,
      alkalineSessions: alkalineSessions ?? this.alkalineSessions,
      checkins: checkins ?? this.checkins,
      absences: absences ?? this.absences,
      lastSeen: lastSeen ?? this.lastSeen,
      token: token ?? this.token,
      profilePhoto: profilePhoto ?? this.profilePhoto,
    );
  }
}

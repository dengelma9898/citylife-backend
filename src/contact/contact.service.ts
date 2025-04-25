import { Injectable, Logger, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { ContactRequest, ContactRequestType } from './interfaces/contact-request.interface';
import { ContactMessage } from './interfaces/contact-message.interface';
import { GeneralContactRequestDto } from './dto/general-contact-request.dto';
import { FeedbackRequestDto } from './dto/feedback-request.dto';
import { BusinessClaimRequestDto } from './dto/business-claim-request.dto';
import { BusinessRequestDto } from './dto/business-request.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/enums/user-type.enum';
import { AddMessageDto } from './dto/add-message.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService
  ) {}

  private async createContactRequest(
    data: GeneralContactRequestDto | FeedbackRequestDto | BusinessClaimRequestDto | BusinessRequestDto,
    type: ContactRequestType
  ): Promise<ContactRequest> {
    this.logger.debug(`Creating new ${type} contact request`);
    const db = getFirestore();
    
    const initialMessage: ContactMessage = {
      userId: data.userId,
      message: data.message,
      createdAt: new Date().toISOString(),
      isAdminResponse: false
    };

    const contactRequestData = {
      type,
      businessId: 'businessId' in data ? data.businessId : '',
      messages: [initialMessage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isProcessed: false,
      responded: false
    };

    const docRef = await addDoc(collection(db, 'contact_requests'), contactRequestData);
    
    // Speichere die ID im Benutzermodell
    const user = await this.usersService.getById(data.userId);
    if (user) {
      const contactRequestIds = user.contactRequestIds || [];
      contactRequestIds.push(docRef.id);
      
      if ('userType' in user) {
        // Normaler Benutzer
        await this.usersService.update(data.userId, { contactRequestIds });
      } else {
        // Geschäftsbenutzer
        await this.usersService.updateBusinessUser(data.userId, { contactRequestIds });
      }
    }
    
    return {
      id: docRef.id,
      ...contactRequestData
    } as ContactRequest;
  }

  public async createGeneralContactRequest(data: GeneralContactRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.GENERAL);
  }

  public async createFeedbackRequest(data: FeedbackRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.FEEDBACK);
  }

  public async createBusinessClaimRequest(data: BusinessClaimRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.BUSINESS_CLAIM);
  }

  public async createBusinessRequest(data: BusinessRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.BUSINESS_REQUEST);
  }

  public async addAdminResponse(id: string, data: AdminResponseDto): Promise<ContactRequest> {
    this.logger.debug(`Adding admin response to contact request ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'contact_requests', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Contact request with id ${id} not found`);
    }

    const contactRequest = docSnap.data() as ContactRequest;
    const newMessage: ContactMessage = {
      userId: data.userId,
      message: data.message,
      createdAt: new Date().toISOString(),
      isAdminResponse: true
    };

    await updateDoc(docRef, {
      messages: [...contactRequest.messages, newMessage],
      responded: true,
      updatedAt: new Date().toISOString()
    });
    
    const updatedRequest = await this.getById(id, data.userId);
    if (!updatedRequest) {
      throw new Error(`Contact request with id ${id} not found after update`);
    }
    
    return updatedRequest;
  }

  public async getAll(): Promise<ContactRequest[]> {
    this.logger.debug('Getting all contact requests');
    const db = getFirestore();
    const contactRequestsCol = collection(db, 'contact_requests');
    const snapshot = await getDocs(contactRequestsCol);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContactRequest));
  }

  public async getById(id: string, userId: string): Promise<ContactRequest | null> {
    this.logger.debug(`Getting contact request ${id} for user ${userId}`);
    const db = getFirestore();
    const docRef = doc(db, 'contact_requests', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    // Prüfe den Benutzertyp
    const user = await this.usersService.getById(userId);
    if (!user) {
      return null;
    }

    // SUPER_ADMIN hat Zugriff auf alle Kontaktanfragen
    if ('userType' in user && user.userType === UserType.SUPER_ADMIN) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ContactRequest;
    }

    // Für normale Benutzer: Prüfe, ob die Anfrage dem Benutzer gehört
    if (!user.contactRequestIds || !user.contactRequestIds.includes(id)) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as ContactRequest;
  }

  public async markAsProcessed(id: string): Promise<ContactRequest> {
    this.logger.debug(`Marking contact request ${id} as processed`);
    const db = getFirestore();
    const docRef = doc(db, 'contact_requests', id);
    
    await updateDoc(docRef, {
      isProcessed: true,
      updatedAt: new Date().toISOString()
    });
    
    const updatedRequest = await this.getById(id, '');
    if (!updatedRequest) {
      throw new Error(`Contact request with id ${id} not found after update`);
    }
    
    return updatedRequest;
  }

  public async getContactRequestsByUserId(userId: string): Promise<ContactRequest[]> {
    this.logger.debug(`Getting contact requests for user ${userId}`);
    const db = getFirestore();
    
    // Hole zuerst die Kontaktanfrage-IDs vom Benutzer
    const user = await this.usersService.getById(userId);
    if (!user || !user.contactRequestIds || user.contactRequestIds.length === 0) {
      return [];
    }

    console.log(user.contactRequestIds);
    // Hole alle Dokumente in einem einzigen Aufruf
    const contactRequestsRef = collection(db, 'contact_requests');
    const q = query(contactRequestsRef, where('__name__', 'in' , [ 'BBkfpSHWdbxhCElK6jN1', 'n5fdfDgy6drpLqYRZ2t3' ]));
    const querySnapshot = await getDocs(q);
    // Konvertiere die Ergebnisse in das erwartete Format
    const contactRequests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContactRequest));

    // Sortiere nach Erstellungsdatum (neueste zuerst)
    return contactRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getOpenRequestsCount(): Promise<number> {
    this.logger.debug('Getting count of open contact requests');
    const db = getFirestore();
    const contactRequestsRef = collection(db, 'contact_requests');
    const q = query(contactRequestsRef, where('responded', '==', false));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.size;
  }

  public async addMessage(id: string, userId: string, messageDto: AddMessageDto): Promise<ContactRequest> {
    this.logger.debug(`Adding message to contact request ${id} from user ${userId}`);
    
    // Prüfe zuerst, ob der Benutzer Zugriff auf die Anfrage hat
    const contactRequest = await this.getById(id, userId);
    if (!contactRequest) {
      throw new UnauthorizedException('Sie haben keine Berechtigung, diese Kontaktanfrage zu bearbeiten');
    }

    const user = await this.usersService.getById(userId);
    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    const newMessage: ContactMessage = {
      userId,
      message: messageDto.message,
      createdAt: new Date().toISOString(),
      isAdminResponse: 'userType' in user && user.userType === UserType.SUPER_ADMIN
    };

    const db = getFirestore();
    const docRef = doc(db, 'contact_requests', id);
    
    await updateDoc(docRef, {
      messages: [...contactRequest.messages, newMessage],
      updatedAt: new Date().toISOString(),
      // Wenn es eine Admin-Antwort ist, setzen wir responded auf true
      ...(newMessage.isAdminResponse && { responded: true })
    });

    // Hole die aktualisierte Anfrage
    const updatedRequest = await this.getById(id, userId);
    if (!updatedRequest) {
      throw new Error('Kontaktanfrage konnte nach dem Update nicht gefunden werden');
    }

    return updatedRequest;
  }
} 
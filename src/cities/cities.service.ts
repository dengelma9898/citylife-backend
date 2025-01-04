import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

@Injectable()
export class CitiesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  public async getAllCities(): Promise<any[]> {
    const db = getFirestore();
    const citiesCol = collection(db, 'cities');
    const citySnapshot = await getDocs(citiesCol);
    return citySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  public async getCityById(cityId: string): Promise<any> {
    const db = getFirestore();
    const cityRef = doc(db, 'cities', cityId);
    const cityDoc = await getDoc(cityRef);

    if (!cityDoc.exists()) {
      return null;
    }

    return {
      id: cityDoc.id,
      ...cityDoc.data()
    };
  }
} 